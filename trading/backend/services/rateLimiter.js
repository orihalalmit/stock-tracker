class RateLimiter {
  constructor(maxRequests = 200, timeWindow = 60000) { // 200 requests per minute for Alpaca
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
    this.queue = [];
    this.processing = false;
  }

  async makeRequest(requestFn, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject, priority, timestamp: Date.now() });
      this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Clean up old requests from tracking
      const now = Date.now();
      this.requests = this.requests.filter(time => now - time < this.timeWindow);
      
      // Check if we can make a request
      if (this.requests.length >= this.maxRequests) {
        const oldestRequest = Math.min(...this.requests);
        const waitTime = this.timeWindow - (now - oldestRequest);
        console.log(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
        await this.sleep(waitTime);
        continue;
      }

      const { requestFn, resolve, reject } = this.queue.shift();
      
      try {
        this.requests.push(now);
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        if (error.response?.status === 429) {
          // Rate limited - wait longer and retry
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.log(`Rate limited. Waiting ${retryAfter} seconds before retry.`);
          await this.sleep(retryAfter * 1000);
          // Put the request back in the queue
          this.queue.unshift({ requestFn, resolve, reject, priority: 0, timestamp: Date.now() });
        } else {
          reject(error);
        }
      }
      
      // Small delay between requests to be respectful
      await this.sleep(100);
    }
    
    this.processing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueLength() {
    return this.queue.length;
  }

  getRequestCount() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length;
  }
}

module.exports = RateLimiter; 