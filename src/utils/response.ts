
/**
 * Response structure for API operations
 */
export class SuccessResponse {
    /**
     * Whether the operation was successful
     * @example true
     */
    success: boolean;

    /**
     * Message describing the result
     * @example "Building crawler started successfully"
     */
    message: string;
}