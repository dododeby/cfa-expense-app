import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { ORGANIZATIONS } from "@/lib/constants";

export async function GET() {
    // Use shared Supabase Admin Client
    const supabase = supabaseAdmin;

    const accountId = '1.1.1.1'; // Salários
    const year = 2024;
    const month = 11; // November as default test month, assumed based on context of 'preenchimento'
    const total = 1000;
    const finalistica = 100;

    const results = [];
    const errors = [];

    // Filter only CRAs (exclude CFA if desired, but user said "all tables", usually implies all regions)
    // The user said "todos os cras". Organization type 'CRA'.
    const cras = ORGANIZATIONS.filter(org => org.type === 'CRA');

    for (const cra of cras) {
        const { data, error } = await supabase
            .from('expenses')
            .upsert({
                organization_id: cra.id,
                account_id: accountId,
                total: total,
                finalistica: finalistica,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'organization_id, account_id'
            })
            .select();

        if (error) {
            console.error(`Error processing ${cra.id}:`, error);
            errors.push({ org: cra.id, error });
        } else {
            results.push({ org: cra.id, status: 'success' });
        }
    }

    return NextResponse.json({
        message: "Seeding complete",
        processed: results.length,
        errors: errors,
        details: results
    });
}
