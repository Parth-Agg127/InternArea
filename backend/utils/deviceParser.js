/**
 * Lightweight User-Agent parser and IST time checker.
 * No external dependencies required.
 */

/**
 * Parse a User-Agent string + screen dimensions into structured device info.
 * @param {string} userAgent - The browser's navigator.userAgent string
 * @param {number} [screenWidth] - The screen width in pixels (optional, helps with device classification)
 * @returns {{ browser: string, browserVersion: string, os: string, deviceType: string }}
 */
function parseDevice(userAgent, screenWidth) {
  const ua = userAgent || "";

  // --- Browser Detection ---
  let browser = "Unknown";
  let browserVersion = "";

  if (/Edg\//i.test(ua)) {
    browser = "Edge";
    browserVersion = (ua.match(/Edg\/([\d.]+)/) || [])[1] || "";
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    browser = "Opera";
    browserVersion = (ua.match(/(?:OPR|Opera)\/([\d.]+)/) || [])[1] || "";
  } else if (/(Chrome|CriOS)\//i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
    browserVersion = (ua.match(/(?:Chrome|CriOS)\/([\d.]+)/) || [])[1] || "";
  } else if (/Safari\//i.test(ua) && !/(Chrome|CriOS)/i.test(ua)) {
    browser = "Safari";
    browserVersion = (ua.match(/Version\/([\d.]+)/) || [])[1] || "";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
    browserVersion = (ua.match(/Firefox\/([\d.]+)/) || [])[1] || "";
  }

  // --- OS Detection ---
  let os = "Unknown";

  if (/Windows NT 10/i.test(ua)) os = "Windows 10";
  else if (/Windows NT 11/i.test(ua)) os = "Windows 11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) {
    const ver = (ua.match(/Mac OS X ([\d_]+)/) || [])[1];
    os = ver ? `macOS ${ver.replace(/_/g, ".")}` : "macOS";
  } else if (/Android/i.test(ua)) {
    const ver = (ua.match(/Android ([\d.]+)/) || [])[1];
    os = ver ? `Android ${ver}` : "Android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const ver = (ua.match(/OS ([\d_]+)/) || [])[1];
    os = ver ? `iOS ${ver.replace(/_/g, ".")}` : "iOS";
  } else if (/Linux/i.test(ua)) os = "Linux";

  // --- Device Type Detection ---
  let deviceType = "desktop";

  // Check UA patterns for mobile/tablet
  const isMobileUA = /Android.+Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);

  if (isMobileUA) {
    deviceType = "mobile";
  } else if (isTabletUA) {
    deviceType = "tablet";
  } else if (screenWidth && screenWidth < 768) {
    // Fallback: if screen is very small, treat as mobile
    deviceType = "mobile";
  } else if (screenWidth && screenWidth >= 768 && screenWidth < 1024) {
    deviceType = "tablet";
  }

  return { browser, browserVersion, os, deviceType };
}

/**
 * Check if the current time falls within the mobile login window (10:00 AM – 1:00 PM IST).
 * @returns {boolean} true if current IST time is between 10:00 and 13:00
 */
function isWithinMobileWindow() {
  // Get current UTC time and convert to IST (UTC + 5:30)
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();

  // IST = UTC + 5 hours 30 minutes
  let istMinutes = utcHours * 60 + utcMinutes + 330; // 330 = 5*60 + 30

  // Handle day overflow
  if (istMinutes >= 1440) istMinutes -= 1440;

  const istHour = Math.floor(istMinutes / 60);

  // Allow login between 10:00 AM (10) and 1:00 PM (13) — i.e. 10:00 to 12:59
  return istHour >= 10 && istHour < 13;
}

/**
 * Extract client IP address from an Express request object.
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first one
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}

module.exports = { parseDevice, isWithinMobileWindow, getClientIP };
