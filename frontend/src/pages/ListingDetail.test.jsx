import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ListingDetail from "./ListingDetail.jsx";

// Stored-XSS test (Phase 3 XSS pass): an attacker controls listing
// title/description entirely (any seller can set them to anything via
// the API, bypassing whatever a frontend form would validate). This
// mocks the API layer to hand ListingDetail exactly that payload — the
// same shape a real attacker-created listing would deliver — and asserts
// React's default escaping renders it as inert text, not markup.
vi.mock("../api/client.js", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "../api/client.js";

const XSS_TITLE = '<img src=x onerror=alert(1)>';
const XSS_DESCRIPTION = '<script>window.__xssExecuted = true;</script>Buy my thing';

function renderListingDetail() {
  return render(
    <MemoryRouter initialEntries={["/listings/abc123"]}>
      <Routes>
        <Route path="/listings/:id" element={<ListingDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ListingDetail — stored XSS via listing content", () => {
  beforeEach(() => {
    delete window.__xssExecuted;
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({
      id: "abc123",
      title: XSS_TITLE,
      description: XSS_DESCRIPTION,
      priceMinorUnits: 1000,
      currency: "NPR",
      images: [],
    });
  });

  it("renders the attacker payload as literal text, not as markup", async () => {
    renderListingDetail();

    await waitFor(() => expect(screen.getByText(XSS_TITLE)).toBeInTheDocument());
    expect(screen.getByText(/Buy my thing/)).toBeInTheDocument();
  });

  it("never creates an actual <script> element from listing content", async () => {
    renderListingDetail();
    await waitFor(() => expect(screen.getByText(XSS_TITLE)).toBeInTheDocument());

    expect(document.querySelectorAll("script").length).toBe(0);
    expect(window.__xssExecuted).toBeUndefined();
  });

  it("never creates a real <img onerror> element from listing content — the payload stays text", async () => {
    renderListingDetail();
    await waitFor(() => expect(screen.getByText(XSS_TITLE)).toBeInTheDocument());

    // The only real <img> elements on the page come from listing.images
    // (server-generated filenames) — none here, since images: []. If the
    // title/description payload had been rendered as HTML instead of
    // text, an <img onerror=...> would show up as a real element.
    const images = document.querySelectorAll("img");
    for (const img of images) {
      expect(img.getAttribute("onerror")).toBeNull();
    }
  });
});
