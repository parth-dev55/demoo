# AgriGPT – Scalable Firestore Database Design

This document outlines the NoSQL database schema, relationship strategies, and indexing design for AgriGPT using Firebase Firestore. The design is optimized for high read/write throughput, minimal document sizes, and enterprise scalability.

## 1. Schema Design (Collections & Subcollections)

In Firestore, deeply nesting data is an anti-pattern if the data grows infinitely. We use a mix of Root Collections and Subcollections to ensure queries remain fast and document sizes stay well under the 1MB limit.

### User & Farm Management
*   **`users`** (Root Collection)
    *   `uid` (Document ID)
        *   `email`, `displayName`, `role`, `createdAt`
        *   `settings`: Embedded object (e.g., `theme`, `language`, `currency`) to save read operations.
    *   **`notifications`** (Subcollection): Unbounded list of user alerts.
        *   `id`, `title`, `message`, `read` (boolean), `createdAt`
    *   **`farms`** (Subcollection): Farm Profiles & Locations.
        *   `farmId` (Document ID)
            *   `name`, `totalArea`, `location` (GeoPoint), `soilType`, `irrigationMethod`
        *   **`fields`** (Sub-subcollection): Specific plots within a farm.
            *   `fieldId`: `name`, `area`, `boundaries` (Array of GeoPoints).
        *   **`crop_history`** (Sub-subcollection): Historical crop cycles.
            *   `season`, `cropType`, `yieldQuantity`, `startDate`, `endDate`

### AI & Chat System
*   **`conversations`** (Root Collection)
    *   `conversationId` (Document ID)
        *   `userId`, `title`, `createdAt`, `lastUpdatedAt`, `summary`
    *   **`messages`** (Subcollection): Chat History.
        *   `messageId`: `role` (user/assistant), `content`, `timestamp`, `toolsUsed` (Array), `visualType` (chart/weather/etc)

### Diagnostics & Analytics
*   **`disease_reports`** (Root Collection)
    *   `reportId`: `userId`, `farmId`, `fieldId`, `diseaseName`, `confidenceScore`, `status`, `treatmentSuggested`, `createdAt`
*   **`yield_predictions`** (Root Collection)
    *   `predictionId`: `farmId`, `cropType`, `predictedYield`, `confidenceInterval`, `factors` (weather, soil), `createdAt`
*   **`transactions`** (Root Collection) - *Handles Expenses & Revenue*
    *   `transactionId`: `userId`, `farmId`, `type` ("expense" | "revenue"), `category` (seeds/fertilizer/sale), `amount`, `date`, `receiptUrl`

### Marketplace & Commerce
*   **`products`** (Root Collection)
    *   `productId`: `supplierId`, `name`, `description`, `price`, `category`, `stockQuantity`, `rating`, `searchTerms` (Array for simple search)
*   **`orders`** (Root Collection)
    *   `orderId`: `buyerId`, `sellerId`, `totalAmount`, `status` (pending/shipped/delivered), `items` (Array of objects), `shippingAddress`, `createdAt`

### Global & Utility Data
*   **`weather_cache`** (Root Collection)
    *   `locationHash` (Document ID): `data` (JSON response), `expireAt` (Timestamp for TTL)
*   **`government_schemes`** (Root Collection)
    *   `schemeId`: `title`, `description`, `eligibilityCriteria`, `region`, `deadline`, `url`
*   **`calendar_events`** (Root Collection)
    *   `eventId`: `userId`, `farmId`, `title`, `type` (harvest, fertilize, meeting), `startDate`, `endDate`
*   **`assets`** (Root Collection) - *Images & Documents metadata*
    *   `assetId`: `userId`, `type` (image/pdf), `storageUrl`, `bucketPath`, `sizeBytes`, `context` (disease_report/receipt)
*   **`audit_logs`** (Root Collection)
    *   `logId`: `userId`, `action`, `resource`, `ipAddress`, `timestamp`

---

## 2. Relationship Strategies

Firestore is a NoSQL database, meaning joins (`SQL JOIN`) do not exist. We rely on the following strategies:

1.  **Denormalization (Read Optimization):**
    *   Instead of storing just a `supplierId` in a `product` document and forcing a second read to get the supplier's name, we store `supplier: { id: "123", name: "AgroCorp" }` in the `product` document.
2.  **Reference IDs (Write Optimization):**
    *   For data that changes frequently (like a user's role), we store the `userId` in `conversations` and fetch the user profile if needed, rather than duplicating the profile across thousands of chat messages.
3.  **Hierarchical Ownership:**
    *   Using `users/{uid}/farms/{farmId}` ensures that deleting a user makes it easy to cascade deletes (using Cloud Functions) and simplifies Firestore Security Rules (e.g., `allow read, write: if request.auth.uid == userId;`).

---

## 3. Indexing Strategy

Firestore automatically creates single-field indexes for all fields. However, complex queries require explicit **Composite Indexes**. 

### Required Composite Indexes (`firestore.indexes.json` format)

1.  **Chat History Loading:**
    *   Collection: `messages`
    *   Fields: `conversationId` (ASC), `timestamp` (DESC)
2.  **Financial Analytics (Transactions):**
    *   Collection: `transactions`
    *   Fields: `userId` (ASC), `type` (ASC), `date` (DESC)
    *   *Use Case:* "Show me all expenses for last month."
3.  **Marketplace Search & Filter:**
    *   Collection: `products`
    *   Fields: `category` (ASC), `price` (ASC)
    *   *Use Case:* "Filter fertilizers by lowest price."
4.  **Farm Disease Tracking:**
    *   Collection: `disease_reports`
    *   Fields: `farmId` (ASC), `status` (ASC), `createdAt` (DESC)
5.  **Order Management:**
    *   Collection: `orders`
    *   Fields: `buyerId` (ASC), `status` (ASC), `createdAt` (DESC)

---

## 4. Optimization for Scalability

To ensure the platform can scale to millions of farmers without degrading performance or accruing massive cloud bills:

1.  **TTL (Time-To-Live) Policies:**
    *   Implement Firestore TTL on the `weather_cache` collection using the `expireAt` field. This automatically deletes stale weather data without consuming write operations from the application backend.
2.  **Pagination (Cursor-based):**
    *   Never query unbounded collections directly. Use `limit()` and `startAfter()` for `messages`, `transactions`, and `audit_logs` to maintain fast response times and low read costs.
3.  **Distributed Counters:**
    *   For highly contended values (e.g., global "Total Disease Reports Detected" or "Product View Counts"), use Firestore Distributed Counters (sharding) to bypass the 1-write-per-second-per-document limit.
4.  **Cloud Storage for Large Payloads:**
    *   Never store base64 images, heavy JSON analytics, or large chat attachments in Firestore. Upload the file to Firebase Storage and store only the `storageUrl` and metadata in the `assets` collection.
5.  **Event-Driven Aggregations:**
    *   Instead of calculating total farm expenses on the fly (which requires reading hundreds of `transaction` documents), use a **Firestore Trigger (Cloud Function)** `onWrite` for transactions to update a single `monthlyExpenses` field on the `farm` document. This converts $O(N)$ reads into $O(1)$ read.
