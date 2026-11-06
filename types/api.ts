export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        fields?: Record<string, string[]>;
    };
    requestId: string;
}