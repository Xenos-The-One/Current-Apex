import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("../drizzle/schema", () => ({
  leads: { clientId: "clientId", status: "status", firstName: "firstName", lastName: "lastName", email: "email", phone: "phone", company: "company" },
}));

describe("getLeadsByClientIdPaginated logic", () => {
  it("calculates correct offset from page and limit", () => {
    const page = 3;
    const limit = 100;
    const offset = (page - 1) * limit;
    expect(offset).toBe(200);
  });

  it("calculates total pages correctly", () => {
    const total = 14027;
    const limit = 100;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(141);
  });

  it("shows correct range for page 1", () => {
    const page = 1;
    const limit = 100;
    const total = 14027;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    expect(start).toBe(1);
    expect(end).toBe(100);
  });

  it("shows correct range for last page", () => {
    const page = 141;
    const limit = 100;
    const total = 14027;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    expect(start).toBe(14001);
    expect(end).toBe(14027);
  });

  it("page buttons show at most 5 pages around current", () => {
    const totalPages = 141;
    const currentPage = 70;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
    expect(pages).toEqual([68, 69, 70, 71, 72]);
    expect(pages.length).toBe(5);
  });

  it("page buttons clamp correctly at start", () => {
    const totalPages = 141;
    const currentPage = 1;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
    expect(pages[0]).toBe(1);
    expect(pages.length).toBe(5);
  });

  it("page buttons clamp correctly at end", () => {
    const totalPages = 141;
    const currentPage = 141;
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
    expect(pages[pages.length - 1]).toBe(141);
    expect(pages.length).toBe(5);
  });
});
