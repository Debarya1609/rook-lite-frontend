console.log("Rook Lite content script loaded");

function extractPageContent() {
  return {
    title: document.title,
    meta_description:
      document.querySelector("meta[name='description']")?.getAttribute("content") || "",
    headings: Array.from(document.querySelectorAll("h1, h2, h3"))
      .map(h => h.textContent?.trim())
      .filter(Boolean),
    body_text: document.body.innerText.slice(0, 5000),
    cta_texts: Array.from(document.querySelectorAll("button, a"))
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .slice(0, 20),
    social_links: Array.from(document.querySelectorAll("a"))
      .map(a => a.href)
      .filter(href =>
        href.includes("twitter.com") ||
        href.includes("linkedin.com") ||
        href.includes("instagram.com")
      )
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_PAGE") {
    sendResponse(extractPageContent());
  }
});
