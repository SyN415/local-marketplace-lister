# UI/UX Rehaul & AI Feature Implementation Plan

## 1. UI/UX Rehaul ("Marketplace Hustle")

### Theme & Visual Style
*   **Typography:** Switch to "Inter" font family. Ensure it's imported in `index.html`.
*   **Color Palette:**
    *   **Primary:** Vibrant Blue/Purple Gradient (`linear-gradient(135deg, #6366f1 0%, #a855f7 100%)`) for buttons and active states.
    *   **Secondary:** Energetic Orange/Pink (`linear-gradient(135deg, #f97316 0%, #ec4899 100%)`) for accents.
    *   **Background:**
        *   Light: `#f8fafc` (Slate 50)
        *   Dark: `#0f172a` (Slate 900)
*   **Glassmorphism:**
    *   Create a reusable `GlassCard` component or style mixin.
    *   Style: `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);`
*   **Micro-animations:**
    *   Hover effects on cards (scale up slightly, shadow increase).
    *   Button press effects.

### Implementation Steps (Frontend)
1.  **Update `frontend/src/theme/index.ts`:**
    *   Define the new palette with gradients.
    *   Override `MuiButton`, `MuiCard`, `MuiPaper` styles to use the new visual language.
    *   Implement the glassmorphism styles in the theme components.
2.  **Global Styles:**
    *   Update `frontend/src/index.css` to import Inter font and set base background colors.
3.  **Component Updates:**
    *   Refactor `ListingForm` to use the new `GlassCard` style for steps.
    *   Update `ListingsList` to use the new card styles with hover animations.

## 2. AI Feature: Smart Image Analysis

### Architecture
*   **Trigger:** User drops an image into the `ImageUpload` component.
*   **Action:** A "Analyze with AI" button appears (or auto-triggers if configured).
*   **Process:**
    1.  Frontend sends the image (Base64 or FormData) to `POST /api/listings/analyze`.
    2.  Backend receives the image.
    3.  Backend calls OpenAI Vision API (or similar) with a prompt to extract:
        *   Title
        *   Description
        *   Category
        *   Condition
        *   Estimated Price
    4.  Backend returns JSON data.
    5.  Frontend populates the form fields with the received data.

### Implementation Steps (Backend)
1.  **Environment:** Add `OPENAI_API_KEY` to `backend/.env`.
2.  **Service:** Create `backend/src/services/ai.service.ts` to handle OpenAI API calls.
3.  **Controller/Route:**
    *   Add `POST /analyze` to `backend/src/routes/listing.routes.ts`.
    *   Handle image upload (using `multer` if sending file, or body parser if sending base64). *Decision: Use `multer` for memory storage to handle larger files efficiently.*

### Implementation Steps (Frontend)
1.  **API Service:** Add `analyzeImage` method to `frontend/src/services/api.ts`.
2.  **Component:**
    *   Update `frontend/src/components/listings/fields/ImageUpload.tsx`:
        *   Add state for `isAnalyzing`.
        *   Add "Auto-fill details" button overlay on the uploaded image.
    *   Update `frontend/src/components/listings/ListingForm.tsx`:
        *   Pass a handler to `ImageUpload` that accepts the AI data and calls `setValue` for the form fields.

## 3. Execution Order
1.  **Backend AI Setup:** Get the backend ready to accept images and return analysis.
2.  **Frontend AI Integration:** Connect the frontend to the new backend endpoint.
3.  **UI/UX Overhaul:** Apply the new theme and styles across the application.