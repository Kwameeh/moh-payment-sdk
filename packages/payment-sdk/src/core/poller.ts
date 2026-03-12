export class Poller {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  constructor(private config: { intervalMs: number; maxAttempts: number }) {}

  start<T>(
    fetchFn: () => Promise<T>,
    onResult: (result: T) => void,
    onRetry: (attempt: number) => void,
    onTimeout: () => void
  ): void {
    if (this.isPolling) return;
    this.isPolling = true;

    let attempt = 0;

    this.intervalId = setInterval(async () => {
      attempt++;

      try {
        const result = await fetchFn();
        this.isPolling = false;
        clearInterval(this.intervalId!);
        this.intervalId = null;
        onResult(result);
      } catch {
        if (attempt >= this.config.maxAttempts) {
          this.isPolling = false;
          clearInterval(this.intervalId!);
          this.intervalId = null;
          onTimeout();
        } else {
          onRetry(attempt);
        }
      }
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
  }

  getIsPolling(): boolean {
    return this.isPolling;
  }
}
