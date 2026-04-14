import asyncio
import httpx
import time
import sys

# Configuration
BASE_URL = "http://localhost:8000"
USERNAME = "testuser_stress"
PASSWORD = "testpassword123"
CONCURRENT_REQUESTS = 50
TOTAL_REQUESTS = 100

async def stress_test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Signup/Login to get token
        print(f"--- Stress Test Configuration ---")
        print(f"Base URL: {BASE_URL}")
        print(f"Concurrency: {CONCURRENT_REQUESTS}")
        print(f"Total Requests: {TOTAL_REQUESTS}")
        print(f"----------------------------------\n")

        print("Step 1: Authenticating...")
        try:
            # Try login first
            login_data = {"username": USERNAME, "password": PASSWORD}
            response = await client.post(f"{BASE_URL}/login", data=login_data)
            
            if response.status_code != 200:
                print("User not found, signing up...")
                signup_data = {"username": USERNAME, "email": "stress@test.com", "password": PASSWORD}
                await client.post(f"{BASE_URL}/signup", data=signup_data)
                response = await client.post(f"{BASE_URL}/login", data=login_data)

            token = response.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            print("Successfully authenticated.\n")
        except Exception as e:
            print(f"Authentication failed: {e}")
            return

        # 2. Prepare chat request
        chat_payload = {
            "session_id": "stress_session_1",
            "message": "Tell me a short joke about AI stress testing.",
            "mode": "chat"
        }

        # 3. Define the request task
        async def send_chat_request(request_id):
            start_time = time.time()
            try:
                # Using standard /chat endpoint (non-streaming) for easier metrics
                resp = await client.post(f"{BASE_URL}/chat", json=chat_payload, headers=headers)
                latency = time.time() - start_time
                return resp.status_code, latency
            except Exception as e:
                return "Error", 0

        # 4. Run stress test in batches
        print(f"Step 2: Sending {TOTAL_REQUESTS} requests with concurrency {CONCURRENT_REQUESTS}...")
        
        all_results = []
        start_time_total = time.time()
        
        for i in range(0, TOTAL_REQUESTS, CONCURRENT_REQUESTS):
            batch_size = min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i)
            tasks = [send_chat_request(j) for j in range(batch_size)]
            results = await asyncio.gather(*tasks)
            all_results.extend(results)
            print(f"Completed {len(all_results)}/{TOTAL_REQUESTS} requests...")

        end_time_total = time.time()
        
        # 5. Analyze results
        success_count = sum(1 for status, _ in all_results if status == 200)
        error_count = TOTAL_REQUESTS - success_count
        latencies = [lat for status, lat in all_results if status == 200]
        
        avg_latency = sum(latencies) / len(latencies) if latencies else 0
        min_latency = min(latencies) if latencies else 0
        max_latency = max(latencies) if latencies else 0
        throughput = TOTAL_REQUESTS / (end_time_total - start_time_total)

        print(f"\n--- Stress Test Results ---")
        print(f"Total Time: {end_time_total - start_time_total:.2f} seconds")
        print(f"Successful Requests: {success_count}")
        print(f"Failed Requests: {error_count}")
        print(f"Throughput: {throughput:.2f} req/s")
        print(f"Avg Latency: {avg_latency:.2f}s")
        print(f"Min Latency: {min_latency:.2f}s")
        print(f"Max Latency: {max_latency:.2f}s")
        print(f"---------------------------")

if __name__ == "__main__":
    asyncio.run(stress_test())
