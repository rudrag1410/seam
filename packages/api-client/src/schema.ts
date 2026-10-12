
export interface paths {
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["healthz_healthz_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/readyz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["readyz_readyz_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["feed_v1_activity_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["login_v1_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["logout_v1_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["refresh_v1_auth_refresh_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/signup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["signup_v1_auth_signup_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/jobs/analyze": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["analyze_v1_jobs_analyze_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["me_v1_me_get"];
        put?: never;
        post?: never;
        delete: operations["delete_me_v1_me_delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/onboarding/complete": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["complete_onboarding_v1_me_onboarding_complete_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_preferences_v1_me_preferences_get"];
        put: operations["put_preferences_v1_me_preferences_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/me/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_profile_v1_me_profile_get"];
        put: operations["put_profile_v1_me_profile_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/resumes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["upload_v1_resumes_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/resumes/primary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["primary_v1_resumes_primary_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/resumes/{resume_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_one_v1_resumes__resume_id__get"];
        put: operations["update_v1_resumes__resume_id__put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tailor-sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_all_v1_tailor_sessions_get"];
        put?: never;
        post: operations["create_v1_tailor_sessions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tailor-sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_one_v1_tailor_sessions__session_id__get"];
        put?: never;
        post?: never;
        delete: operations["remove_v1_tailor_sessions__session_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tailor-sessions/{session_id}/finalize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["finalize_v1_tailor_sessions__session_id__finalize_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tailor-sessions/{session_id}/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["stream_v1_tailor_sessions__session_id__stream_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tailor-sessions/{session_id}/suggestions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["patch_decisions_v1_tailor_sessions__session_id__suggestions_patch"];
        trace?: never;
    };
    "/v1/tailor-sessions/{session_id}/suggestions/{suggestion_id}/regenerate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["regenerate_v1_tailor_sessions__session_id__suggestions__suggestion_id__regenerate_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_versions_v1_versions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{a}/compare/{b}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["compare_v1_versions__a__compare__b__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{version_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["get_one_v1_versions__version_id__get"];
        put?: never;
        post?: never;
        delete: operations["remove_v1_versions__version_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{version_id}/cover-letter": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["cover_letter_v1_versions__version_id__cover_letter_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{version_id}/cover-letters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["list_cover_letters_v1_versions__version_id__cover_letters_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{version_id}/export": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["export_v1_versions__version_id__export_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/versions/{version_id}/interview-prep": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["prep_v1_versions__version_id__interview_prep_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ActivityGroup: ActivityGroup;
        ActivityKind: ActivityKind;
        ActivityOut: {
            created_at: string;
            entity_id: string | null;
            entity_type: components["schemas"]["EntityType"] | null;
            id: number;
            summary: string;
            type: components["schemas"]["ActivityKind"];
        };
        ActivityPage: {
            items: components["schemas"]["ActivityOut"][];
            next_cursor: number | null;
        };
        AtsCheck: {
            hint: string | null;
            key: string;
            label: string;
            passed: boolean;
            weight: number;
        };
        AtsScore: {
            checks: components["schemas"]["AtsCheck"][];
            total: number;
        };
        Body_upload_v1_resumes_post: {
            file: string;
        };
        Bullet: {
            id: string;
            text: string;
        };
        ChangeKind: ChangeKind;
        ChunkData: {
            text: string;
        };
        "Contact-Input": {
            email?: string | null;
            headline?: string | null;
            links?: string[];
            location?: string | null;
            name: string;
            phone?: string | null;
        };
        "Contact-Output": {
            email: string | null;
            headline: string | null;
            links: string[];
            location: string | null;
            name: string;
            phone: string | null;
        };
        CoverLetterIn: {
            include_notice_period: boolean;
            length: components["schemas"]["LetterLength"];
            tone: components["schemas"]["Tone"];
        };
        CoverLetterOut: {
            body: string;
            created_at: string;
            id: string;
            length: string;
            tone: string;
            version_id: string;
        };
        Decision: Decision;
        DecisionIn: {
            edited_text?: string | null;
            id: string;
            status: components["schemas"]["Decision"];
        };
        DecisionsPatch: {
            decisions: components["schemas"]["DecisionIn"][];
        };
        DoneData: {
            count: number;
            degraded: boolean;
            duration_ms: number | null;
        };
        "EducationItem-Input": {
            degree: string;
            details?: string | null;
            end?: string | null;
            id: string;
            school: string;
            start?: string | null;
        };
        "EducationItem-Output": {
            degree: string;
            details: string | null;
            end: string | null;
            id: string;
            school: string;
            start: string | null;
        };
        "EducationSection-Input": {
            id: string;
            items?: components["schemas"]["EducationItem-Input"][];
            type: "education";
        };
        "EducationSection-Output": {
            id: string;
            items: components["schemas"]["EducationItem-Output"][];
            type: "education";
        };
        EmploymentType: EmploymentType;
        EntityType: EntityType;
        ErrorBody: {
            code: components["schemas"]["ErrorCode"];
            hint: string | null;
            message: string;
            retryable: boolean;
        };
        ErrorCode: ErrorCode;
        ErrorData: {
            code: components["schemas"]["ErrorCode"];
            hint: string | null;
            message: string;
            retryable: boolean;
        };
        ErrorEnvelope: {
            error: components["schemas"]["ErrorBody"];
        };
        "ExperienceItem-Input": {
            bullets?: components["schemas"]["Bullet"][];
            company: string;
            end?: string | null;
            id: string;
            location?: string | null;
            start?: string | null;
            title: string;
        };
        "ExperienceItem-Output": {
            bullets: components["schemas"]["Bullet"][];
            company: string;
            end: string | null;
            id: string;
            location: string | null;
            start: string | null;
            title: string;
        };
        "ExperienceSection-Input": {
            id: string;
            items?: components["schemas"]["ExperienceItem-Input"][];
            type: "experience";
        };
        "ExperienceSection-Output": {
            id: string;
            items: components["schemas"]["ExperienceItem-Output"][];
            type: "experience";
        };
        ExportFormat: ExportFormat;
        ExportTemplate: ExportTemplate;
        FinalizeOut: {
            version_id: string;
        };
        FitCheck: {
            items: components["schemas"]["FitItem"][];
        };
        FitItem: {
            detail: string;
            key: components["schemas"]["FitKey"];
            label: string;
            status: components["schemas"]["FitStatus"];
        };
        FitKey: FitKey;
        FitStatus: FitStatus;
        Intensity: Intensity;
        InterviewPrep: {
            questions: components["schemas"]["InterviewQuestion"][];
        };
        InterviewQuestion: {
            question: string;
            talking_points: string[];
            why: string;
        };
        JDAnalysis: {
            company: string;
            employment_type: components["schemas"]["EmploymentType"];
            facet_confidence: {
                [key: string]: number;
            };
            keywords: string[];
            location: string;
            must_haves: components["schemas"]["Requirement"][];
            nice_to_haves: components["schemas"]["Requirement"][];
            responsibilities: string[];
            salary_range: components["schemas"]["SalaryRange"] | null;
            seniority: components["schemas"]["Seniority"];
            title: string;
            work_mode: components["schemas"]["WorkMode"];
        };
        JDAnalyzeRequest: {
            text?: string | null;
        };
        JDAnalyzeResponse: {
            analysis: components["schemas"]["JDAnalysis"];
            company: string;
            degraded: boolean;
            fit: components["schemas"]["FitCheck"];
            id: string;
            title: string;
            warnings: string[];
        };
        JobData: {
            analysis: components["schemas"]["JDAnalysis"];
            company: string;
            fit: components["schemas"]["FitCheck"];
            title: string;
        };
        LetterEvents: {
            chunk: components["schemas"]["ChunkData"];
            done: components["schemas"]["LetterSavedData"];
            error: components["schemas"]["ErrorData"];
        };
        LetterLength: LetterLength;
        LetterSavedData: {
            id: string;
        };
        LoginRequest: {
            email: string;
            password: string;
        };
        MatchScore: {
            keyword_alignment: number;
            matched_keywords: string[];
            missing_keywords: string[];
            must_have_coverage: number;
            nice_to_have_coverage: number;
            requirements: components["schemas"]["RequirementCoverage"][];
            section_completeness: number;
            seniority_fit: number;
            total: number;
        };
        NodeChange: {
            after: string | null;
            before: string | null;
            kind: components["schemas"]["ChangeKind"];
            node_id: string;
            section: string;
        };
        OpName: OpName;
        "OtherSection-Input": {
            id: string;
            lines?: string[];
            title: string;
            type: "other";
        };
        "OtherSection-Output": {
            id: string;
            lines: string[];
            title: string;
            type: "other";
        };
        ParsePath: ParsePath;
        "PreferencesIO-Input": {
            avoid_tech?: string[];
            industries?: string[];
            job_types?: components["schemas"]["EmploymentType"][];
            locations?: string[];
            open_to_relocation: boolean;
            preferred_tech?: string[];
            seniority?: components["schemas"]["Seniority"] | null;
            target_roles?: string[];
            work_authorization?: string | null;
            work_modes?: components["schemas"]["WorkMode"][];
        };
        "PreferencesIO-Output": {
            avoid_tech: string[];
            industries: string[];
            job_types: components["schemas"]["EmploymentType"][];
            locations: string[];
            open_to_relocation: boolean;
            preferred_tech: string[];
            seniority: components["schemas"]["Seniority"] | null;
            target_roles: string[];
            work_authorization: string | null;
            work_modes: components["schemas"]["WorkMode"][];
        };
        "ProfileIO-Input": {
            ctc_currency: string;
            current_company?: string | null;
            current_ctc?: number | null;
            current_title?: string | null;
            expected_ctc?: number | null;
            full_name: string;
            headline?: string | null;
            links?: {
                [key: string]: string;
            };
            location?: string | null;
            notice_period_days?: number | null;
            phone?: string | null;
            years_experience?: number | null;
        };
        "ProfileIO-Output": {
            ctc_currency: string;
            current_company: string | null;
            current_ctc: number | null;
            current_title: string | null;
            expected_ctc: number | null;
            full_name: string;
            headline: string | null;
            links: {
                [key: string]: string;
            };
            location: string | null;
            notice_period_days: number | null;
            phone: string | null;
            years_experience: number | null;
        };
        "ProjectItem-Input": {
            bullets?: components["schemas"]["Bullet"][];
            id: string;
            name: string;
            subtitle?: string | null;
        };
        "ProjectItem-Output": {
            bullets: components["schemas"]["Bullet"][];
            id: string;
            name: string;
            subtitle: string | null;
        };
        "ProjectsSection-Input": {
            id: string;
            items?: components["schemas"]["ProjectItem-Input"][];
            type: "projects";
        };
        "ProjectsSection-Output": {
            id: string;
            items: components["schemas"]["ProjectItem-Output"][];
            type: "projects";
        };
        RegenerateIn: {
            instruction: string;
        };
        Requirement: {
            id: string;
            keywords: string[];
            text: string;
            weight: number;
        };
        RequirementCoverage: {
            confidence: number | null;
            id: string;
            level: number;
            must_have: boolean;
            text: string;
            verdict: components["schemas"]["Verdict"];
        };
        "Resume-Input": {
            contact?: components["schemas"]["Contact-Input"];
            sections?: (components["schemas"]["SummarySection-Input"] | components["schemas"]["SkillsSection-Input"] | components["schemas"]["ExperienceSection-Input"] | components["schemas"]["ProjectsSection-Input"] | components["schemas"]["EducationSection-Input"] | components["schemas"]["OtherSection-Input"])[];
        };
        "Resume-Output": {
            contact: components["schemas"]["Contact-Output"];
            sections: (components["schemas"]["SummarySection-Output"] | components["schemas"]["SkillsSection-Output"] | components["schemas"]["ExperienceSection-Output"] | components["schemas"]["ProjectsSection-Output"] | components["schemas"]["EducationSection-Output"] | components["schemas"]["OtherSection-Output"])[];
        };
        ResumeOut: {
            created_at: string;
            document: components["schemas"]["Resume-Output"];
            filename: string | null;
            id: string;
            page_count: number | null;
            parse_path: components["schemas"]["ParsePath"] | null;
            prefill: {
                [key: string]: string | number | null;
            };
            size_bytes: number | null;
        };
        SalaryPeriod: SalaryPeriod;
        SalaryRange: {
            currency: string | null;
            max: number | null;
            min: number | null;
            period: components["schemas"]["SalaryPeriod"];
        };
        ScoreData: {
            before: components["schemas"]["MatchScore"];
            projected: components["schemas"]["MatchScore"] | null;
        };
        SectionName: SectionName;
        Seniority: Seniority;
        SessionListItem: {
            created_at: string;
            decided_count: number;
            id: string;
            jd_company: string | null;
            jd_title: string | null;
            match_after: number | null;
            match_before: number | null;
            status: components["schemas"]["SessionStatus"];
            suggestion_count: number;
        };
        SessionStatus: SessionStatus;
        SignupRequest: {
            email: string;
            full_name: string;
            password: string;
        };
        "SkillGroup-Input": {
            id: string;
            items?: string[];
            label: string;
        };
        "SkillGroup-Output": {
            id: string;
            items: string[];
            label: string;
        };
        "SkillsSection-Input": {
            groups?: components["schemas"]["SkillGroup-Input"][];
            id: string;
            type: "skills";
        };
        "SkillsSection-Output": {
            groups: components["schemas"]["SkillGroup-Output"][];
            id: string;
            type: "skills";
        };
        Stage: Stage;
        StageData: {
            progress: number;
            section: components["schemas"]["SectionName"] | null;
            stage: components["schemas"]["Stage"];
            tasks: {
                [key: string]: number;
            } | null;
        };
        StreamEvent: StreamEvent;
        SuggestionOut: {
            addresses: string[];
            before: {
                [key: string]: unknown;
            } | null;
            checks: {
                [key: string]: unknown;
            };
            confidence: number | null;
            edited_text: string | null;
            evidence: string[];
            flag_reason: string | null;
            id: string;
            op: components["schemas"]["OpName"];
            payload: {
                [key: string]: unknown;
            };
            rationale: string | null;
            requires_confirmation: boolean;
            score_delta: number | null;
            section: components["schemas"]["SectionName"];
            seq: number;
            status: components["schemas"]["Decision"];
            target: string;
        };
        "SummarySection-Input": {
            id: string;
            text: string;
            type: "summary";
        };
        "SummarySection-Output": {
            id: string;
            text: string;
            type: "summary";
        };
        TailorCreate: {
            base_version_id?: string | null;
            intensity: components["schemas"]["Intensity"];
            jd_id?: string | null;
            jd_text?: string | null;
            resume_id: string;
            sections?: components["schemas"]["SectionName"][];
        };
        TailorCreated: {
            id: string;
        };
        TailorEvents: {
            done: components["schemas"]["DoneData"];
            error: components["schemas"]["ErrorData"];
            jd: components["schemas"]["JobData"];
            score: components["schemas"]["ScoreData"];
            stage: components["schemas"]["StageData"];
            suggestion: components["schemas"]["SuggestionOut"];
            warning: components["schemas"]["WarningData"];
        };
        TailorSessionOut: {
            created_at: string;
            degraded: boolean;
            error_code: components["schemas"]["ErrorCode"] | null;
            error_message: string | null;
            fit: components["schemas"]["FitCheck"] | null;
            id: string;
            intensity: components["schemas"]["Intensity"];
            jd: components["schemas"]["JDAnalysis"] | null;
            jd_company: string | null;
            jd_id: string;
            jd_text: string;
            jd_title: string | null;
            resume: components["schemas"]["Resume-Output"];
            resume_id: string;
            score_after: components["schemas"]["MatchScore"] | null;
            score_before: components["schemas"]["MatchScore"] | null;
            sections: components["schemas"]["SectionName"][];
            status: components["schemas"]["SessionStatus"];
            suggestions: components["schemas"]["SuggestionOut"][];
            version_id: string | null;
        };
        Tone: Tone;
        UserOut: {
            email: string;
            full_name: string;
            has_resume: boolean;
            id: string;
            onboarded: boolean;
        };
        Verdict: Verdict;
        VersionCompare: {
            a: components["schemas"]["VersionDetail"];
            ats_delta: number | null;
            b: components["schemas"]["VersionDetail"];
            changes: components["schemas"]["NodeChange"][];
            match_delta: number | null;
        };
        VersionDetail: {
            ats: components["schemas"]["AtsScore"] | null;
            ats_score: number | null;
            created_at: string;
            document: components["schemas"]["Resume-Output"];
            id: string;
            jd_company: string | null;
            jd_title: string | null;
            label: string;
            match: components["schemas"]["MatchScore"] | null;
            match_score: number | null;
            parent_version_id: string | null;
            session_id: string | null;
        };
        VersionOut: {
            ats_score: number | null;
            created_at: string;
            id: string;
            jd_company: string | null;
            jd_title: string | null;
            label: string;
            match_score: number | null;
            parent_version_id: string | null;
            session_id: string | null;
        };
        WarningCode: WarningCode;
        WarningData: {
            code: components["schemas"]["WarningCode"];
            message: string;
        };
        WorkMode: WorkMode;
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    healthz_healthz_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    readyz_readyz_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    feed_v1_activity_get: {
        parameters: {
            query?: {
                cursor?: number | null;
                type?: components["schemas"]["ActivityGroup"] | null;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivityPage"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    login_v1_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    logout_v1_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    refresh_v1_auth_refresh_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    signup_v1_auth_signup_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SignupRequest"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        [key: string]: unknown;
                    };
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    analyze_v1_jobs_analyze_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["JDAnalyzeRequest"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JDAnalyzeResponse"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    me_v1_me_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    delete_me_v1_me_delete: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    complete_onboarding_v1_me_onboarding_complete_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_preferences_v1_me_preferences_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreferencesIO-Output"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    put_preferences_v1_me_preferences_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreferencesIO-Input"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreferencesIO-Output"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_profile_v1_me_profile_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfileIO-Output"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    put_profile_v1_me_profile_put: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfileIO-Input"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfileIO-Output"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    upload_v1_resumes_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_upload_v1_resumes_post"];
            };
        };
        responses: {
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResumeOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    primary_v1_resumes_primary_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResumeOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_one_v1_resumes__resume_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resume_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResumeOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    update_v1_resumes__resume_id__put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                resume_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Resume-Input"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResumeOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    list_all_v1_tailor_sessions_get: {
        parameters: {
            query?: {
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionListItem"][];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    create_v1_tailor_sessions_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TailorCreate"];
            };
        };
        responses: {
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TailorCreated"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_one_v1_tailor_sessions__session_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TailorSessionOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    remove_v1_tailor_sessions__session_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    finalize_v1_tailor_sessions__session_id__finalize_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FinalizeOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    stream_v1_tailor_sessions__session_id__stream_get: {
        parameters: {
            query?: never;
            header?: {
                "last-event-id"?: string | null;
            };
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["TailorEvents"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    patch_decisions_v1_tailor_sessions__session_id__suggestions_patch: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecisionsPatch"];
            };
        };
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    regenerate_v1_tailor_sessions__session_id__suggestions__suggestion_id__regenerate_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
                suggestion_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegenerateIn"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SuggestionOut"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    list_versions_v1_versions_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionOut"][];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    compare_v1_versions__a__compare__b__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                a: string;
                b: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionCompare"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    get_one_v1_versions__version_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["VersionDetail"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    remove_v1_versions__version_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    cover_letter_v1_versions__version_id__cover_letter_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CoverLetterIn"];
            };
        };
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["LetterEvents"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    list_cover_letters_v1_versions__version_id__cover_letters_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CoverLetterOut"][];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    export_v1_versions__version_id__export_get: {
        parameters: {
            query?: {
                format?: string;
                template?: string;
            };
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
    prep_v1_versions__version_id__interview_prep_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                version_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InterviewPrep"];
                };
            };
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorEnvelope"];
                };
            };
        };
    };
}
export enum ActivityGroup {
    Resume = "resume",
    Jd = "jd",
    Tailor = "tailor",
    Review = "review",
    Version = "version",
    CoverLetter = "cover_letter",
    Profile = "profile"
}
export enum ActivityKind {
    ResumeUploaded = "resume.uploaded",
    JdAnalyzed = "jd.analyzed",
    TailorCompleted = "tailor.completed",
    ReviewFinalized = "review.finalized",
    VersionExported = "version.exported",
    CoverLetterGenerated = "cover_letter.generated",
    ProfileUpdated = "profile.updated"
}
export enum ChangeKind {
    Added = "added",
    Removed = "removed",
    Changed = "changed",
    Moved = "moved"
}
export enum Decision {
    Pending = "pending",
    Accepted = "accepted",
    Rejected = "rejected",
    Edited = "edited"
}
export enum EmploymentType {
    FullTime = "full_time",
    Contract = "contract",
    PartTime = "part_time",
    Internship = "internship",
    Freelance = "freelance",
    Unspecified = "unspecified"
}
export enum EntityType {
    Session = "session",
    Version = "version",
    Resume = "resume",
    Jd = "jd"
}
export enum ErrorCode {
    CsrfBlocked = "CSRF_BLOCKED",
    EmailTaken = "EMAIL_TAKEN",
    ExportFailed = "EXPORT_FAILED",
    FileCorrupt = "FILE_CORRUPT",
    FileEmpty = "FILE_EMPTY",
    FileTooLarge = "FILE_TOO_LARGE",
    FileTypeUnsupported = "FILE_TYPE_UNSUPPORTED",
    FormatUnsupported = "FORMAT_UNSUPPORTED",
    InvalidCredentials = "INVALID_CREDENTIALS",
    JdEmpty = "JD_EMPTY",
    JdNotAJd = "JD_NOT_A_JD",
    JdTooLong = "JD_TOO_LONG",
    JdTooShort = "JD_TOO_SHORT",
    JdUnreadable = "JD_UNREADABLE",
    LlmNotConfigured = "LLM_NOT_CONFIGURED",
    LlmUnavailable = "LLM_UNAVAILABLE",
    NotFound = "NOT_FOUND",
    NoJd = "NO_JD",
    PdfPasswordProtected = "PDF_PASSWORD_PROTECTED",
    RegenerateEmpty = "REGENERATE_EMPTY",
    ResumeUnreadable = "RESUME_UNREADABLE",
    SessionNotReady = "SESSION_NOT_READY",
    TailorFailed = "TAILOR_FAILED",
    TemplateUnsupported = "TEMPLATE_UNSUPPORTED",
    TooManyPages = "TOO_MANY_PAGES",
    Unauthorized = "UNAUTHORIZED",
    ValidationFailed = "VALIDATION_FAILED"
}
export enum ExportFormat {
    Pdf = "pdf",
    Docx = "docx",
    Txt = "txt"
}
export enum ExportTemplate {
    Classic = "classic",
    Modern = "modern"
}
export enum FitKey {
    WorkMode = "work_mode",
    Location = "location",
    JobType = "job_type",
    Compensation = "compensation",
    Seniority = "seniority"
}
export enum FitStatus {
    Ok = "ok",
    Warn = "warn",
    Unclear = "unclear"
}
export enum Intensity {
    Light = "light",
    Balanced = "balanced",
    Bold = "bold"
}
export enum LetterLength {
    Short = "short",
    Standard = "standard"
}
export enum OpName {
    ReplaceText = "replace_text",
    Reorder = "reorder",
    InsertBullet = "insert_bullet",
    RemoveBullet = "remove_bullet",
    AddSkill = "add_skill",
    RemoveSkill = "remove_skill",
    RewriteSummary = "rewrite_summary"
}
export enum ParsePath {
    Text = "text",
    Vision = "vision",
    Basic = "basic"
}
export enum SalaryPeriod {
    Year = "year",
    Month = "month"
}
export enum SectionName {
    Summary = "summary",
    Skills = "skills",
    Experience = "experience",
    Projects = "projects"
}
export enum Seniority {
    Junior = "junior",
    Mid = "mid",
    Senior = "senior",
    Staff = "staff",
    Lead = "lead",
    Unspecified = "unspecified"
}
export enum SessionStatus {
    Queued = "queued",
    Running = "running",
    Ready = "ready",
    Failed = "failed",
    Finalized = "finalized"
}
export enum Stage {
    Reading = "reading",
    Analyzing = "analyzing",
    Tailoring = "tailoring"
}
export enum StreamEvent {
    Stage = "stage",
    Jd = "jd",
    Score = "score",
    Suggestion = "suggestion",
    Warning = "warning",
    Done = "done",
    Error = "error",
    Chunk = "chunk"
}
export enum Tone {
    Professional = "professional",
    Warm = "warm",
    Direct = "direct"
}
export enum Verdict {
    Demonstrated = "demonstrated",
    Listed = "listed",
    Missing = "missing",
    Unsure = "unsure"
}
export enum WarningCode {
    JdNotice = "JD_NOTICE",
    Partial = "PARTIAL",
    DegradedChecks = "DEGRADED_CHECKS"
}
export enum WorkMode {
    Remote = "remote",
    Hybrid = "hybrid",
    Onsite = "onsite",
    Unspecified = "unspecified"
}
