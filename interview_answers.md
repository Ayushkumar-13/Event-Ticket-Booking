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
