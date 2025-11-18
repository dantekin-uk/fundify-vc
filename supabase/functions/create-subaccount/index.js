import { serve } from "std/server";

serve(async (req) => {
  try {
    const body = await req.json();
    const { orgId, business_name, settlement_bank, account_number, currency, contact_email } = body;
    if (!orgId || !business_name || !settlement_bank || !account_number) {
      return new Response(JSON.stringify({ message: "Missing fields" }), { status: 400 });
    }
    const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET");
    const paystackRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        business_name,
        settlement_bank,
        account_number,
        percentage_charge: 0,
        primary_contact_email: contact_email
      })
    });
    const paystackData = await paystackRes.json();
    if (!paystackRes.ok) {
      return new Response(JSON.stringify({ message: "Paystack error", detail: paystackData }), { status: 500 });
    }
    const sub = paystackData.data;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/subaccounts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify([{
        org_id: orgId,
        paystack_subaccount_id: sub.subaccount_code || sub.id,
        business_name,
        settlement_bank,
        account_number,
        currency: currency || "NGN",
        metadata: sub
      }])
    });
    const inserted = await insertRes.json();
    return new Response(JSON.stringify({ subaccount: inserted[0] }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: "Server error", error: err.message }), { status: 500 });
  }
});
