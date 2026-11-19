/**
 * @file LinkedText.jsx
 * @description Renders message text with URLs converted into external links.
 */

/** Matches http(s):// and bare www. URLs. The capture group makes split() alternate. */
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;

/** Punctuation and invisible marks that belong to the sentence, not the link target. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"\u200E\u200F\u202A-\u202E\uFEFF]+$/;

/**
 * Normalizes a displayed URL into an absolute href.
 *
 * @param {string} url - URL as written in the message.
 * @returns {string} Absolute http(s) URL.
 */
function toHref(url) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

/**
 * Splits text on URLs and renders each one as an external link.
 * Links open in the system browser via the window-open handler in the main process.
 *
 * @component
 * @param {Object} props
 * @param {string} props.text - Raw message text.
 * @returns {JSX.Element}
 */
export const LinkedText = ({ text }) => {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        // Even indexes are plain text; odd indexes are the captured URLs.
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>;
        }

        const url = part.replace(TRAILING_PUNCTUATION, "");
        const trailing = part.slice(url.length);

        return (
          <span key={index}>
            <a
              href={toHref(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#53bdeb] underline break-all"
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </>
  );
};
