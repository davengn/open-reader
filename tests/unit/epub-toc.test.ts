import { describe, expect, it } from "vitest";
import { flattenToc, isValidTocHref } from "@/lib/epub/toc";

describe("EPUB TOC utilities", () => {
  describe("flattenToc", () => {
    it("flattens a nested TOC list with depths", () => {
      const nested = [
        {
          label: "Chapter 1",
          href: "chap1.xhtml",
          subitems: [
            {
              label: "Section 1.1",
              href: "chap1.xhtml#s1",
              subitems: [
                {
                  label: "Subsection 1.1.1",
                  href: "chap1.xhtml#s1_1",
                },
              ],
            },
          ],
        },
        {
          label: "Chapter 2",
          href: "chap2.xhtml",
        },
      ];

      const flat = flattenToc(nested, 2);
      expect(flat).toHaveLength(4);
      expect(flat[0]).toEqual({ id: "chap1.xhtml", label: "Chapter 1", href: "chap1.xhtml", depth: 0 });
      expect(flat[1]).toEqual({ id: "chap1.xhtml#s1", label: "Section 1.1", href: "chap1.xhtml#s1", depth: 1 });
      expect(flat[2]).toEqual({ id: "chap1.xhtml#s1_1", label: "Subsection 1.1.1", href: "chap1.xhtml#s1_1", depth: 2 });
      expect(flat[3]).toEqual({ id: "chap2.xhtml", label: "Chapter 2", href: "chap2.xhtml", depth: 0 });
    });

    it("filters out empty labels", () => {
      const input = [
        { label: "Chapter 1", href: "chap1.xhtml" },
        { label: "", href: "chap2.xhtml" },
        { label: "  ", href: "chap3.xhtml" },
      ];
      const flat = flattenToc(input);
      expect(flat).toHaveLength(1);
      expect(flat[0].label).toBe("Chapter 1");
    });

    it("caps depth at maxDepth limit", () => {
      const nested = [
        {
          label: "Level 0",
          href: "l0.xhtml",
          subitems: [
            {
              label: "Level 1",
              href: "l1.xhtml",
              subitems: [
                {
                  label: "Level 2",
                  href: "l2.xhtml",
                  subitems: [
                    {
                      label: "Level 3",
                      href: "l3.xhtml",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      // Depth limit = 1: should not include Level 2 or Level 3
      const flat = flattenToc(nested, 1);
      expect(flat).toHaveLength(2);
      expect(flat[0].label).toBe("Level 0");
      expect(flat[1].label).toBe("Level 1");
    });
  });

  describe("isValidTocHref", () => {
    it("accepts local internal targets", () => {
      expect(isValidTocHref("chapter-1.xhtml")).toBe(true);
      expect(isValidTocHref("ch2.xhtml#ref")).toBe(true);
    });

    it("rejects external absolute URLs", () => {
      expect(isValidTocHref("http://example.com/ch1.xhtml")).toBe(false);
      expect(isValidTocHref("https://google.com")).toBe(false);
      expect(isValidTocHref("//domain.com")).toBe(false);
    });
  });
});
