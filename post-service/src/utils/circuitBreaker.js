/**
 * Circuit Breaker Pattern Implementation
 * Protects against cascading failures when external services are down
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // Open after N failures
    this.successThreshold = options.successThreshold || 2; // Close after N successes in HALF_OPEN
    this.timeout = options.timeout || 30000; // Try recovery after 30s
    this.serviceName = options.serviceName || "Service";

    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  // Check if circuit should transition from OPEN to HALF_OPEN
  checkState() {
    if (this.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.timeout) {
        console.log(
          `Circuit Breaker (${this.serviceName}): OPEN → HALF_OPEN (testing recovery)`
        );
        this.state = "HALF_OPEN";
        this.successCount = 0;
        this.failureCount = 0;
      }
    }
  }

  // Check if request should be allowed
  canExecute() {
    this.checkState();

    if (this.state === "OPEN") {
      console.log(
        `Circuit Breaker (${this.serviceName}): OPEN - Request blocked`
      );
      throw new Error(
        `Circuit breaker is OPEN for ${this.serviceName}. Service unavailable.`
      );
    }
    return true;
  }

  // Record successful request
  recordSuccess() {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        console.log(
          `Circuit Breaker (${this.serviceName}): HALF_OPEN → CLOSED (recovered)`
        );
        this.state = "CLOSED";
        this.successCount = 0;
      }
    }
  }

  // Record failed request
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
      console.log(
        `Circuit Breaker (${this.serviceName}): CLOSED → OPEN (${this.failureCount} failures)`
      );
      this.state = "OPEN";
    } else if (this.state === "HALF_OPEN") {
      console.log(
        `Circuit Breaker (${this.serviceName}): HALF_OPEN → OPEN (recovery failed)`
      );
      this.state = "OPEN";
      this.successCount = 0;
    }
  }

  // Execute function with circuit breaker protection
  async execute(fn) {
    try {
      this.canExecute();
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  // Get current state
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      serviceName: this.serviceName,
    };
  }
}

module.exports = CircuitBreaker;
