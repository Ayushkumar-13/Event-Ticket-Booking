# Interview Question: Preventing Double-Booking (Concurrency Control)

**Interviewer:** "We often have high-demand events where thousands of users rush to buy tickets at the exact same moment. How would you design your ticketing system to prevent double-booking, ensuring we never sell more tickets than are actually available?"

**Your Answer:**

"To handle high-concurrency ticket sales and prevent double-booking, the core problem we need to solve is a **race condition**—specifically, a 'Lost Update' or 'Read-Modify-Write' anomaly. If two users request the last ticket simultaneously, they might both read that 1 ticket is available, both proceed to book it, and the database decrements the count to -1, over-selling the event.

To solve this, I would implement **Optimistic Concurrency Control (OCC)** using MongoDB's built-in document versioning. Here is how I would integrate it into this project:

### 1. The approach: Optimistic Concurrency Control (OCC)
In our current stack (Node.js/Express + MongoDB), OCC is the most efficient and scalable approach. Instead of completely locking the database row—which is slow and hurts throughput—OCC assumes that most transactions won't conflict. 

Mongoose handles this via the `__v` (version key) field. 

**Integration Steps in the Backend:**
1. **Fetch:** When a user requests a ticket, I fetch the `Event` document, recording its current version (say, `__v: 5`) and verify `availableTickets > 0`.
2. **Attempt Update:** I then attempt to update the document using an atomic operation like `findOneAndUpdate`. Crucially, the query filter will require **both** the event ID and the specific version we read (`{ _id: eventId, __v: 5 }`).
3. **Handle Result:** 
   - If the update is successful, it means no one else modified the event since we read it. The database increments our version to `__v: 6` and decrements the `availableTickets`.
   - If the update returns `null` or 0 modified documents, it means another user bought a ticket milliseconds before us, bumping the version to 6. Our query for version 5 fails. 
4. **Resiliency:** Upon failure, I catch the resulting version error and return a `409 Conflict` to the user, politely asking them to retry, or I automatically retry the operation in the backend loop a few times before failing the request.

### 2. The Alternative: Distributed Locks with Redis
If we were running a highly distributed, microservices-heavy architecture with long-running payment integrations, I might lean toward **Pessimistic Concurrency Control using a Distributed Lock (like Redis using Redlock)**. 

In that scenario:
1. When a user initiates checkout, our server requests a lock in Redis for the specific `eventId:checkout` key with an expiration (e.g., 30 seconds).
2. If acquired, the user proceeds to payment and DB updates exclusively. 
3. If not acquired, the request fails fast, telling the user they are in a queue or that the system is busy.

**Why I chose OCC over Redis for this project:**
For simple ticket decrementing, dragging in a separate Redis infrastructure introduces network overhead, potential single points of failure, and complexity (like what happens if a node dies entirely while holding the lock?). OCC uses the atomic capabilities already built natively into our MongoDB database, keeping our system architecture simpler, self-contained, and highly performant for quick, point-in-time updates."

***

# Interview Question: Idempotency Keys (Preventing Double Charges)

**Interviewer:** "What happens if a user is on mobile, they experience a temporary network drop while clicking 'Pay', so they impatiently click the 'Pay' button 3 more times? How do we prevent charging their credit card 4 times or giving them 4 tickets?"

**Your Answer:**

"To solve the impatient user problem and ensure that network retries don't result in double-booking or double-charging, I would implement **Idempotency Keys**. An idempotent API ensures that no matter how many times a user hits the endpoint with the same request, the resulting state on the server is exactly the same as if they had done it once.

Here is how I implemented it in this project:

### 1. Generating the Key on the Client
When the checkout or booking form loads (or right when the user clicks 'Book'), the frontend (React component) generates a unique string—typically a UUID v4. I store this key in React state so that if the user clicks the button multiple times for the exact same transaction, the **same** UUID is sent every time.
```javascript
const [idempotencyKey] = useState(crypto.randomUUID());
// Sent in the custom header: 'Idempotency-Key'
```

### 2. Validating the Key on the Server
When the Node.js backend receives the `POST /api/tickets/book` request, the very first thing it does is extract `req.headers['idempotency-key']`.

1. **Check for Existing Key:** I query the MongoDB `Ticket` collection to see if a ticket with this `idempotencyKey` already exists.
2. **If it exists:** It means this is a retry of a successful transaction. The server safely skips all database decrements and payment processing, and simply returns a `200 OK` with the exact same ticket object it generated the first time.
3. **If it does not exist:** The server proceeds normally, eventually saving the `idempotencyKey` directly into the new `Ticket` document in MongoDB. Furthermore, I apply a `unique: true` index on the `idempotencyKey` field in Mongoose, providing deep database-level protection against race conditions.

### Why FAANG looks for this:
In distributed systems, networks are inherently unreliable. A server might successfully process a payment, but the connection dies before the server can reply "Success" to the user's phone. Without an idempotency key, the phone automatically retries, and the server blindly processes the payment again. Idempotency guarantees that the core system state remains safe regardless of network failures or user double-clicks."

***

# Interview Question: Database Query Optimization

**Interviewer:** "Imagine your application grows to have 10 million events. When a user searches for 'Music events in New York this weekend', the query takes 5 seconds to load because MongoDB has to scan every single document. How do you optimize this?"

**Your Answer:**

"To optimize complex, read-heavy queries across millions of records, I would implement **Compound Indexes** in MongoDB. Without an index, the database performs a 'Collection Scan' ($COLLSCAN), looking at all 10 million rows one by one. By creating an index, I force MongoDB to construct a B-Tree, completely eliminating the need to scan irrelevant documents resulting in an 'Index Scan' ($IXSCAN) which completes in mere milliseconds.

Here is how I implemented it in this project:

### The Implementation
Inside the Mongoose schema for the `Event` model (`backend/src/models/Event.js`), I attached a compound index directly to the schema before compiling it:

```javascript
// Creates a B-Tree sorting these three fields together
eventSchema.index({ date: 1, location: 1, category: 1 });
```

### Why this specific order? What is the 'ESR Rule'?
When creating a compound index, FAANG engineers follow the **ESR (Equality, Sort, Range)** rule to dictate the order of fields in the index:
1. **Equality (`location`, `category`):** Fields that the user searches for with exact matches (e.g., `location: 'New York'`).
2. **Sort:** Fields the user wants the results ordered by.
3. **Range (`date`, `price`):** Fields searched via ranges (e.g., `date: { $gte: today, $lte: sunday }`).

If our application primarily filters by equality before range, the index allows the database to instantly jump to the 'New York' -> 'Music' branch of the tree, and then sweep through the dates.

### Additional Indexes:
I also added a single-field index for `organizer: 1`. When an event planner opens their dashboard, the system immediately queries `Event.find({ organizer: req.user.id })`. For a platform with thousands of organizers, this prevents the dashboard from hanging while the database searches through unrelated organizers' events."

***

# Interview Question: Distributed Caching Layer (Redis)

**Interviewer:** "Your event listing page (`GET /events`) is hit millions of times a day, but only 5% of users actually buy a ticket. How do you prevent your MongoDB instance from melting down under this read-heavy traffic?"

**Your Answer:**

"To protect the database and ensure lightning-fast response times for end-users, I would implement a **Distributed Caching Layer using Redis**. Because 95% of traffic is just browsing the events, there is no need to query the physical database every single time. By caching the serialized JSON output of the event list directly into Redis memory, we drop database read load down to almost zero for that endpoint.

Here is how I implemented the **Cache-Aside Pattern** in this project:

### 1. The Cache-Aside Flow (`getEvents`)
When a user hits the `GET /api/events` endpoint:
1. The Express server first asks Redis for the key `events_all`.
2. **Cache Hit:** If Redis has the data, the server instantly returns the payload without ever touching MongoDB. This reduces a ~100ms database query to a ~2ms memory fetch.
3. **Cache Miss:** If Redis does *not* have the data (or it expired), the server falls back to MongoDB, retrieves the events, sends them to the user, and *then* writes them to Redis with a Time-To-Live (TTL) expiration of 1 hour to prevent indefinite staleness.

### 2. The Hard Part: Cache Invalidation Strategy
The golden rule of caching is that data can quickly become stale. If a user buys a ticket, or an organizer adds a new event, we cannot wait 1 hour for the cache to clear naturally—we need immediate consistency. 

I implemented active Cache Invalidation across the critical write paths:
* **Event Creation/Updates/Deletion:** In `eventController.js`, whenever an organizer modifies the events list, I added `await redisClient.del('events_all')`.
* **Ticket Purchases:** In `ticketController.js`, the moment a user successfully books a ticket (decrementing `availableTickets`), the server fires `await redisClient.del('events_all')`.

By aggressively invalidating the cache upon any mutation, the very next user who visits the homepage will trigger a Cache Miss, forcing the server to pull the fresh data from MongoDB and re-cache it. This ensures users always see accurate ticket counts and new events while still caching 99% of requests."

****

# Interview Question: Asynchronous Processing (Message Queues)

**Interviewer:** "During a massive ticket drop, thousands of users hit the generic 'Buy' endpoint simultaneously. Processing payments and writing to the database synchronously for every user holds open HTTP connections and eventually crashes the server. How would you redesign the checkout flow to handle massive bursts of traffic?"

**Your Answer:**

"To handle massive bursts of traffic without dropping requests or crashing the server, I would decouple the request-response cycle and implement **Asynchronous Processing using a Message Queue**. Instead of making the user wait for the database and payment gateway to sequentially process their ticket in real-time, the server immediately accepts their request, places it in a queue, and responds instantly, freeing up the HTTP connection.

Here is how I implemented it in this project using **BullMQ** and **Redis**:

### 1. The Queue Architecture (`ticketQueue.js`)
When a user clicks 'Buy Ticket', the Express controller `POST /api/tickets/book` no longer processes the complex MongoDB updates synchronously.

Instead, it takes the user's ID, the event ID, and their `idempotencyKey` and pushes a job onto a Redis-backed queue managed by BullMQ. 
The server immediately returns a `202 Accepted` response to the frontend saying, *'Your request is in line.'*

### 2. The Background Worker (`ticketWorker.js`)
Running completely decoupled from the main Express server process is a Background Worker. This worker pulls jobs off the Redis queue at a controlled, sustainable rate (e.g., `concurrency: 5`), so we never overwhelm our MongoDB database or payment gateway, no matter how many thousands of requests came in at exactly 12:00 PM.

The worker executes the Optimistic Concurrency Control (OCC) logic, decrements the ticket count, handles the simulated payment delay, and commits the ticket out-of-band. 

### 3. Fault Tolerance and Retries
If the database connection drops for a millisecond or the payment gateway times out while the worker is processing a ticket, the user does not get a generic `500 Internal Server Error`.
Because we are using BullMQ, I configured the queue with an **Exponential Backoff Retry Strategy**. 

```javascript
defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
}
```
If the worker fails processing the job, BullMQ automatically puts the ticket request back in the queue and tries again 1 second later, then 2 seconds later. This guarantees high reliability and ensures that no user loses their place in line just because of a transient network hiccup."

***

# Interview Question: Background Workers (Event-Driven Architecture)

**Interviewer:** "When a user successfully books a ticket, our system needs to generate a custom PDF with a barcode, attach it to an email, and securely send it via SMTP. Doing this synchronously blocks the main API thread for 2-3 seconds per user. How would you design this to keep the API lightning fast?"

**Your Answer:**

"To keep the main API thread unblocked and ensure sub-100ms response times for the user, I would move the heavy CPU operations (like PDF generation) and slow Network operations (like SMTP email delivery) entirely out of the main request-response cycle. I would achieve this by implementing an **Event-Driven Architecture using Background Workers**.

Here is exactly how I implemented it in this project using **BullMQ** and **pdfkit/nodemailer**:

### 1. Decoupling the Systems
The primary `ticketWorker` is only responsible for the critical, transactional database operation (decrementing tickets using OCC). 
The exact millisecond that transaction is successfully committed to MongoDB, instead of pausing to generate a PDF, the `ticketWorker` simply packages the user and event payload and **fires a message into a secondary queue**: `notificationQueue.add('send-ticket-email', payload)`. 

The `ticketWorker` then instantly returns `Success` back up the chain to the user.

### 2. The Notification Worker
Running in a completely separate Node.js background process (or thread) is the `notificationWorker`. Its only job is to consume messages from the `notificationQueue`.
When it pops a job, it executes two utility functions sequentially:
1. `generateTicketPDF()`: Uses `pdfkit` to draw a stylized, in-memory PDF Buffer containing the user's name, the event details, and their unique Ticket ID.
2. `sendTicketEmail()`: Opens a secure SMTP connection using `nodemailer` and dispatches the email with the PDF Buffer attached dynamically.

### Why FAANG cares about this pattern:
1. **Unblocked Main Thread:** Node.js is single-threaded. By offloading `pdfkit` (which is CPU intensive) to a background worker, we prevent the main Express server from locking up and dropping other users' requests.
2. **Resilience & Retries:** Sometimes email providers (like SendGrid or AWS SES) go down or rate-limit us. If the `notificationWorker` fails to send the email, the transaction isn't lost. The queue simply holds onto the job and retries it exponentially later (`attempts: 5`), completely invisibly to the user who already received their 'Success' confirmation on the frontend."

***

# Interview Question: Real-Time Data (WebSockets)

**Interviewer:** "During a high-demand ticket sale, users stare at the event page waiting for tickets. If a user buys a ticket, how do you instantly update the 'Available Tickets' countdown on the screens of the 5,000 other people looking at the same page without forcing them to manually click refresh?"

**Your Answer:**

"To provide instant UI state updates across thousands of concurrent users, I would implement **Real-Time Bidirectional Communication using WebSockets**. Instead of having 5,000 browsers execute expensive HTTP Long-Polling requests every second (which would DDoS our own database), WebSockets maintain a single, lightweight, persistent TCP connection.

Here is exactly how I implemented it in this project using **Socket.IO**:

### 1. The Global Broadcaster (Backend)
I attached a generic Socket.IO server directly to the core Node.js `http` server. 
When the background `ticketWorker` successfully processes a payment and atomically decrements the ticket count in MongoDB, it grabs the global socket instance and emits an event:
```javascript
io.emit('ticket_updated', {
    eventId: eventId,
    availableTickets: updatedEvent.availableTickets
});
```
Because the worker pushes this directly through the active socket pipeline, we completely bypass the database for the broadcast, pushing the exact integer out to the internet in sub-millisecond time.

### 2. The Reactive Listener (Frontend)
On the client side, inside the React `EventDetails` component, I instantiate a `socket.io-client` connection inside a `useEffect` hook that mounts when the user opens the page.

The browser silently listens for the `ticket_updated` broadcast. If the `eventId` in the broadcast matches the `id` of the page the user is currently viewing, it simply calls `setEvent(..., availableTickets)`:
```javascript
socket.on('ticket_updated', (data) => {
    if (data.eventId === id) {
        setEvent(prev => ({ ...prev, availableTickets: data.availableTickets }));
    }
});
```

### Why FAANG cares about this pattern:
1. **Solving the C10K Problem:** Traditional HTTP requests require opening headers, parsing cookies, and closing connections. Socket.IO keeps a single 2-way pipe open, allowing a single mid-tier server to easily broadcast to 10,000+ connected clients simultaneously with almost zero CPU overhead.
2. **Reactive User Experience:** By driving React state directly from a websocket stream, users experience a "live" countdown. It creates urgency and prevents disappointment, as users see tickets disappearing in absolute real-time before they attempt to click 'buy'."

***

# Interview Question: Automated Testing & CI/CD Pipelines

**Interviewer:** "At Amazon, we deploy code to production hundreds of times a day. How can we trust that the new code you wrote for the checkout flow today didn't secretly break the user login flow you wrote three months ago?"

**Your Answer:**

"The only way to achieve continuous deployment at scale without causing catastrophic regressions is to implement a mathematically rigid **Automated Testing Suite**. Developers should never be trusted to manually click through their app to verify it works; automated scripts must prove it computationally on a CI/CD pipeline before the code is ever merged.

To prove my understanding of this, I built an Integration Testing Suite for this project using **Jest** and **Supertest**. 

Here is my implementation strategy:

### 1. The Headless Integration Tests
Using `Supertest`, my test scripts boot up an isolated instance of the Express app without explicitly binding it to a local port. I can then write automated assertions that fire simulated HTTP requests at the API endpoints.

For example, I wrote tests that send a `POST /api/auth/register` payload, and computationally assert that the server returns a `201 Created` status code along with a valid JWT token. 

### 2. The Volatile Database (`mongodb-memory-server`)
Testing against a live production or development database is a disaster because tests generate garbage data and can corrupt real state.
To solve this, I configured Jest with a global `setup.js` file utilizing `mongodb-memory-server`. 
1. **Before All Tests:** Jest physically downloads and spins up a temporary, completely blank chunk of MongoDB directly in RAM.
2. **Before Each Test:** Jest automatically wipes every collection clean. This guarantees that my "User Registration" test starts with an empty database every single time, preventing test pollution.
3. **After All Tests:** Jest severs the connection and utterly destroys the RAM chunk, leaving zero trace on the filesystem.

### 3. Mocking External Services
In my tests, I mocked the `Upstash Redis` caches and the `BullMQ` message queues. In a true CI/CD pipeline (like GitHub Actions), the server might not have access to external AWS/Cloudflare networks. By mocking these third-party connections directly in Jest (`jest.mock('../config/redis')`), my tests prove that the *core logic* works perfectly fast without failing due to a random Wi-Fi drop or rate limit.

### Why FAANG cares about this pattern:
1. **Confidence to Move Fast:** Testing takes time upfront, but it pays off exponentially. When I refactored the Event Controller, I simply typed `npm run test` and instantly knew if I broke the Authentication Controller. 
2. **The Definition of Done:** At a FAANG company, a feature is not 'done' when it works on my laptop. It is only 'done' when it is accompanied by tests that enforce its contract for the next 5 years."

***

# Interview Question: AI & LLM Integration (Function Calling)

**Interviewer:** "AI is a buzzword right now, but how do you actually integrate an LLM into a production application to do more than just return text? How can an AI interact safely with our secure database and core business logic?"

**Your Answer:**

"To bridge the gap between a conversational LLM and a secure backend, I implemented an **Autonomous Booking Assistant** using the **Function Calling (Tools)** capabilities of Google AI (Gemini). Instead of giving the AI direct access to the database—which is a massive security risk—I exposed specific, deterministic Node.js functions as 'Tools' that the AI can request to execute on behalf of the user.

Here is exactly how I implemented it in this project:

### 1. The React Frontend (The Interface)
I built a floating Chat Widget in React. When a user types a natural language complex query like *"Find me music events this weekend under $50 and book 2 tickets"*, the frontend simply posts that string to my `/api/chat` endpoint. It has zero knowledge of the database structure.

### 2. The Node.js Backend & Gemini SDK
On the server, I integrated the `@google/generative-ai` SDK. I defined two strict tools using JSON Schema:
- `searchEvents(query, maxPrice)`
- `bookTickets(eventId, quantity)`

When the backend sends the user's prompt to Gemini, it includes these tool definitions.

### 3. The Execution Loop (Agentic Flow)
1. **The Decision:** Gemini analyzes the prompt and determines it cannot answer with plain text. It returns a structured `functionCall` requesting to execute `searchEvents(category: 'music', maxPrice: 50)`.
2. **Local Execution:** My Express server intercepts this request, runs standard Mongoose queries against the database, and returns the JSON results back to Gemini as a `functionResponse`.
3. **The Action:** Gemini matches the events, and then issues a *second* `functionCall`—this time to `bookTickets(eventId, 2)`.
4. **The Security:** Because the execution happens entirely on my Node.js server, standard validation, authentication (`req.user.id`), and Optimistic Concurrency Control (OCC) apply. The AI cannot bypass ticket limits because it triggers the exact same internal logic that a human clicking the UI would trigger.

### Why this demonstrates senior-level architecture:
This demonstrates **Agentic Architecture**. The AI is not just a chatbot; it acts as a reasoning engine orchestrating unstructured human language with highly structured backend controllers, all while maintaining the full security and database integrity of the original system."
