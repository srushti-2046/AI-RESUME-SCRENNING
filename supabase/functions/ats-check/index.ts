import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Create client scoped to user's auth JWT
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user token", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { resumeId, jobId = null, force = false } = body;

    if (!resumeId) {
      return new Response(
        JSON.stringify({ error: "resumeId is required", code: "INVALID_INPUT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Check existing cached report if force is false
    if (!force) {
      let query = supabase
        .from("ats_reports")
        .select(`
          id,
          resume_id,
          job_id,
          candidate_id,
          ats_score,
          ats_status,
          passed_count,
          warning_count,
          failed_count,
          overall_summary,
          recommendations,
          analysis_version,
          created_at,
          updated_at
        `)
        .eq("resume_id", resumeId)
        .eq("recruiter_id", user.id)
        .eq("analysis_version", "ats_v1");

      if (jobId) {
        query = query.eq("job_id", jobId);
      } else {
        query = query.is("job_id", null);
      }

      const { data: existingReport, error: fetchErr } = await query.maybeSingle();

      if (!fetchErr && existingReport) {
        // Fetch check results
        const { data: checks } = await supabase
          .from("ats_check_results")
          .select(`
            id,
            check_type,
            title,
            status,
            score,
            max_score,
            description,
            details,
            sort_order
          `)
          .eq("ats_report_id", existingReport.id)
          .order("sort_order", { ascending: true });

        // Fetch candidate details
        let candidate = null;
        if (existingReport.candidate_id) {
          const { data: cand } = await supabase
            .from("candidates")
            .select("id, full_name, email, current_job_title, match_score, resume_score, status")
            .eq("id", existingReport.candidate_id)
            .maybeSingle();

          if (cand) {
            candidate = {
              id: cand.id,
              name: cand.full_name,
              email: cand.email,
              role: cand.current_job_title,
              matchScore: cand.match_score,
              resumeScore: cand.resume_score,
              status: cand.status,
            };
          }
        }

        return new Response(
          JSON.stringify({
            report: {
              id: existingReport.id,
              resumeId: existingReport.resume_id,
              jobId: existingReport.job_id,
              candidateId: existingReport.candidate_id,
              atsScore: existingReport.ats_score,
              atsStatus: existingReport.ats_status,
              passedCount: existingReport.passed_count,
              warningCount: existingReport.warning_count,
              failedCount: existingReport.failed_count,
              overallSummary: existingReport.overall_summary,
              recommendations: existingReport.recommendations,
              analysisVersion: existingReport.analysis_version,
              createdAt: existingReport.created_at,
              updatedAt: existingReport.updated_at,
            },
            candidate,
            checks: (checks || []).map((c) => ({
              id: c.id,
              checkType: c.check_type,
              title: c.title,
              status: c.status,
              score: c.score,
              maxScore: c.max_score,
              description: c.description,
              details: c.details,
              sortOrder: c.sort_order,
            })),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Execute server-side authoritative deterministic calculation via RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc("run_ats_check", {
      p_resume_id: resumeId,
      p_job_id: jobId || null,
    });

    if (rpcError) {
      console.error("run_ats_check RPC error:", rpcError);
      return new Response(
        JSON.stringify({
          error: rpcError.message || "ATS analysis could not be completed",
          code: "ATS_ANALYSIS_FAILED",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(rpcResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error during ATS check",
        code: "ATS_ANALYSIS_FAILED",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
