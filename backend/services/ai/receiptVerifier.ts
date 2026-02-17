// @ts-nocheck
// AI Receipt Verification Service
// Uses a vision-capable model via OpenRouter to verify PIX payment receipts

import { updatePayment } from "../../db/payments";
import { supabaseAdmin } from "../../supabase";

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODEL = 'google/gemini-2.0-flash-001';

export async function verifyReceiptWithAI(
  paymentId: string,
  receiptUrl: string,
  expectedAmountCents: number
): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.warn('[ReceiptVerifier] OPENROUTER_API_KEY not configured, skipping verification');
    return;
  }

  const expectedAmountBRL = (expectedAmountCents / 100).toFixed(2);

  const systemPrompt = `Voce e um verificador de comprovantes de pagamento PIX.
Analise a imagem do comprovante e extraia:
1. O valor do pagamento (em reais)
2. Se o pagamento foi concluido com sucesso (NAO apenas agendado)
3. Se o pagamento e um AGENDAMENTO (agendado/programado para data futura) ou se foi realmente CONCLUIDO/EFETUADO

IMPORTANTE: Pagamentos AGENDADOS nao sao pagamentos concluidos. Se o comprovante mostrar "agendado", "programado", "sera debitado em", ou qualquer indicacao de que o pagamento ainda nao foi efetuado, marque is_scheduled como true e payment_confirmed como false.

Responda EXATAMENTE neste formato JSON:
{
  "amount_found": <numero em reais, ex: 150.00>,
  "payment_confirmed": <true/false - true SOMENTE se o pagamento foi efetivamente concluido>,
  "is_scheduled": <true/false - true se for um agendamento e nao um pagamento concluido>,
  "confidence": "<high/medium/low>",
  "details": "<breve descricao do que foi encontrado>"
}

Se nao conseguir ler a imagem ou nao for um comprovante, retorne:
{
  "amount_found": null,
  "payment_confirmed": false,
  "is_scheduled": false,
  "confidence": "low",
  "details": "Nao foi possivel verificar o comprovante"
}`;

  const userPrompt = `Verifique este comprovante de pagamento PIX.
O valor esperado e R$ ${expectedAmountBRL}.
O comprovante confere com o valor esperado?`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:5001',
        'X-Title': 'Recruitment Platform',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: receiptUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ReceiptVerifier] OpenRouter API error:', errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON');

    const result = JSON.parse(jsonMatch[0]);
    const amountFoundCents = Math.round((result.amount_found || 0) * 100);
    const tolerance = expectedAmountCents * 0.02; // 2% tolerance
    const amountMatches = Math.abs(amountFoundCents - expectedAmountCents) <= tolerance
      && result.payment_confirmed === true;
    const isScheduled = result.is_scheduled === true;

    if (isScheduled) {
      // Scheduled payment - flag for manual review
      await updatePayment(paymentId, {
        receipt_status: 'pending-review',
        ai_verification_result: { ...result, rejection_reason: 'Pagamento agendado, nao concluido' },
      });
      console.log(`[ReceiptVerifier] Payment ${paymentId} is scheduled (not completed), flagged for review`);

      // Notify admin users
      const { data: admins } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("role", ["admin", "agency"]);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: any) => ({
          user_id: admin.id,
          title: 'Comprovante de pagamento agendado',
          message: `Comprovante enviado e um agendamento, nao um pagamento concluido. Valor: R$ ${expectedAmountBRL}`,
          type: 'warning',
          related_to_type: 'contract',
          related_to_id: paymentId,
          is_read: false,
        }));
        await supabaseAdmin.from("notifications").insert(notifications);
      }
      return;
    }

    if (amountMatches && result.confidence !== 'low') {
      // Auto-approve
      await updatePayment(paymentId, {
        status: 'paid',
        paid_at: new Date().toISOString(),
        receipt_status: 'verified',
        receipt_verified_at: new Date().toISOString(),
        ai_verification_result: result,
      });
      console.log(`[ReceiptVerifier] Payment ${paymentId} auto-verified and marked as paid`);
    } else {
      // Flag for manual review
      await updatePayment(paymentId, {
        receipt_status: 'pending-review',
        ai_verification_result: result,
      });
      console.log(`[ReceiptVerifier] Payment ${paymentId} flagged for manual review`);

      // Notify admin users
      const { data: admins } = await supabaseAdmin
        .from("users")
        .select("id")
        .in("role", ["admin", "agency"]);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: any) => ({
          user_id: admin.id,
          title: 'Comprovante precisa de revisao',
          message: `Um comprovante de pagamento precisa ser verificado. Valor esperado: R$ ${expectedAmountBRL}`,
          type: 'warning',
          related_to_type: 'contract',
          related_to_id: paymentId,
          is_read: false,
        }));
        await supabaseAdmin.from("notifications").insert(notifications);
      }
    }
  } catch (error) {
    console.error('[ReceiptVerifier] AI verification failed:', error);
    // On failure, leave as pending-review for manual check
    await updatePayment(paymentId, {
      receipt_status: 'pending-review',
      ai_verification_result: { error: 'AI verification failed', timestamp: new Date().toISOString() },
    });
  }
}
