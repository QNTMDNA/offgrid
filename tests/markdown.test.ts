import { describe, expect, it } from "vitest";
import { renderMarkdown, toPlainText } from "@/lib/marketing/markdown";

describe("campaign markdown", () => {
  it("escapes author input before producing markup", () => {
    expect(renderMarkdown('<script>alert("x")</script>')).toBe(
      "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>",
    );
  });

  it("renders the supported block subset", () => {
    expect(renderMarkdown("## Monaco\n\n- Suites\n- Tables")).toBe(
      "<h2>Monaco</h2>\n<ul><li>Suites</li><li>Tables</li></ul>",
    );
  });

  it("only links http(s) targets", () => {
    expect(renderMarkdown("[book](https://offgridrace.com)")).toContain(
      '<a href="https://offgridrace.com">book</a>',
    );
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("<a ");
  });

  it("keeps link targets in the plain-text alternative", () => {
    expect(toPlainText("**Book** [here](https://offgridrace.com)")).toBe(
      "Book here (https://offgridrace.com)",
    );
  });
});
