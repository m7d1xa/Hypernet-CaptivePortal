export interface ParsedCardItem {
  card_number: string;
  card_password: string;
  price: number;
  package_name: string;
  batch_id?: string;
  line_number?: number;
}

export interface ParseErrorItem {
  line: number;
  card_number?: string;
  reason: string;
}

export interface ParseResult {
  validCards: ParsedCardItem[];
  errors: ParseErrorItem[];
  totalParsed: number;
}

/**
 * Strip UTF-8 and UTF-16 Byte Order Mark (BOM) from raw text
 */
export function stripBom(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');
}

/**
 * Strict escaping for RouterOS / Mikrotik .rsc export scripts
 */
export function escapeMikrotikString(val: any): string {
  if (val === undefined || val === null) return '';
  return val
    .toString()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
  * Automatic package & price mapping from package text or numeric values.
  * Mappings:
  * - "10 ساعات" / "10" / 10 hours -> 2 NIS, package: "10 ساعات"
  * - "24 ساعة" / "24" / 24 hours -> 3 NIS, package: "24 ساعة"
  * - "48 ساعة" / "48" -> 5 NIS, package: "48 ساعة"
  * - "72 ساعة" / "72" / 3 أيام -> 7 NIS, package: "72 ساعة"
  * - "أسبوع" / "168" -> 15 NIS, package: "باقة الأسبوع"
  * - "شهر" / "720" -> 50 NIS, package: "باقة الشهر"
  */
export function resolvePackageAndPrice(
  rawPackage?: string | number,
  rawPrice?: number | string,
  defaultPrice: number = 0
): { packageName: string; price: number } {
  const pkgStr = (rawPackage ?? "").toString().trim();
  let numPrice = typeof rawPrice === "number" ? rawPrice : parseFloat((rawPrice ?? "").toString());
  if (isNaN(numPrice)) numPrice = 0;

  // Convert Arabic numerals to standard digits
  const normalizedPkg = pkgStr
    .replace(/١٠/g, "10")
    .replace(/٢٤/g, "24")
    .replace(/٤٨/g, "48")
    .replace(/٧٢/g, "72")
    .replace(/١٦٨/g, "168")
    .replace(/٧٢٠/g, "720");

  const lowerPkg = normalizedPkg.toLowerCase();

  // 1. Explicit 10 hours package check
  if (
    lowerPkg.includes("10") ||
    lowerPkg === "10h" ||
    lowerPkg === "10 hours" ||
    lowerPkg.includes("عشر") ||
    lowerPkg.includes("8") || // 8 hours -> 10 hours as requested
    lowerPkg.includes("8 ساعات")
  ) {
    return {
      packageName: "باقة 10 ساعات",
      price: numPrice > 0 ? numPrice : 2
    };
  }
 
  // 2. Explicit 24 hours package check
  if (
    lowerPkg.includes("24") ||
    lowerPkg === "24h" ||
    lowerPkg === "24 hours" ||
    lowerPkg.includes("يوم") ||
    lowerPkg.includes("اشتراك يومي")
  ) {
    return {
      packageName: "باقة 24 ساعة",
      price: numPrice > 0 ? numPrice : 3
    };
  }
 
  // 3. 48 hours package check
  if (lowerPkg.includes("48") || lowerPkg.includes("يومين")) {
    return {
      packageName: "باقة 48 ساعة",
      price: numPrice > 0 ? numPrice : 5
    };
  }
 
  // 4. 72 hours / 3 days package check
  if (lowerPkg.includes("72") || lowerPkg.includes("3 أيام") || lowerPkg.includes("3 ايام")) {
    return {
      packageName: "باقة 72 ساعة",
      price: numPrice > 0 ? numPrice : 7
    };
  }

  // 5. Week / 7 days package check
  if (lowerPkg.includes("168") || lowerPkg.includes("أسبوع") || lowerPkg.includes("اسبوع") || lowerPkg.includes("7 أيام")) {
    return {
      packageName: "باقة الأسبوع",
      price: numPrice > 0 ? numPrice : 15
    };
  }

  // 6. Month / 30 days package check
  if (lowerPkg.includes("720") || lowerPkg.includes("شهر") || lowerPkg.includes("30 يوم")) {
    return {
      packageName: "باقة الشهر",
      price: numPrice > 0 ? numPrice : 50
    };
  }

  // 7. If rawPackage string was provided but didn't match preset keyword
  if (pkgStr.length > 0) {
    let finalPrice = numPrice;
    if (finalPrice <= 0) {
      const matchNum = pkgStr.match(/\d+/);
      if (matchNum) {
        const val = parseInt(matchNum[0], 10);
        if (val === 10) finalPrice = 2;
        else if (val === 24) finalPrice = 3;
        else finalPrice = val;
      } else {
        finalPrice = defaultPrice > 0 ? defaultPrice : 2;
      }
    }
    return {
      packageName: pkgStr,
      price: finalPrice
    };
  }

  // 8. If price was provided without explicit package string
  if (numPrice > 0) {
    if (numPrice === 2) return { packageName: "باقة 10 ساعات", price: 2 };
    if (numPrice === 3) return { packageName: "باقة 24 ساعة", price: 3 };
    if (numPrice === 5) return { packageName: "باقة 48 ساعة", price: 5 };
    if (numPrice === 7) return { packageName: "باقة 72 ساعة", price: 7 };
    if (numPrice === 15) return { packageName: "باقة الأسبوع", price: 15 };
    if (numPrice === 50) return { packageName: "باقة الشهر", price: 50 };
    return { packageName: `باقة ₪${numPrice}`, price: numPrice };
  }

  // 9. Default fallback if no package or price found
  return {
    packageName: "باقة 10 ساعات",
    price: defaultPrice > 0 ? defaultPrice : 2
  };
}

/**
 * Parses raw file content (CSV, JSON, TXT, Excel CSV export) or structured card arrays
 * into mapped card objects with error handling and intra-batch deduplication.
 */
export function parseCardImportData(
  content: string | any[],
  defaultPrice: number = 0,
  batchId?: string
): ParseResult {
  const validCards: ParsedCardItem[] = [];
  const errors: ParseErrorItem[] = [];
  const seenCardNumbers = new Set<string>();

  let rawItems: Array<{
    card_number?: any;
    card_password?: any;
    package_name?: any;
    price?: any;
    line?: number;
  }> = [];

  if (Array.isArray(content)) {
    rawItems = content.map((item, idx) => ({
      card_number: item.card_number || item.cardNumber || item.code || item.cardUsername || item.username,
      card_password: item.card_password || item.cardPassword || item.password || item.pin || item.code,
      package_name: item.package_name || item.packageName || item.package || item.Package || item.baga || item.الباقة || item.باقة || item.نوع_الباقة,
      price: item.price ?? item.Price ?? item.السعر ?? item.سعر,
      line: idx + 1
    }));
  } else if (typeof content === "string") {
    const trimmed = stripBom(content).trim();

    // Attempt JSON parse
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsedJson = JSON.parse(trimmed);
        const cardArray = Array.isArray(parsedJson)
          ? parsedJson
          : Array.isArray(parsedJson.cards)
          ? parsedJson.cards
          : [];

        rawItems = cardArray.map((item: any, idx: number) => ({
          card_number: item.card_number || item.cardNumber || item.code || item.cardUsername || item.username,
          card_password: item.card_password || item.cardPassword || item.password || item.pin || item.code,
          package_name: item.package_name || item.packageName || item.package || item.Package || item.baga || item.الباقة || item.باقة || item.نوع_الباقة,
          price: item.price ?? item.Price ?? item.السعر ?? item.سعر,
          line: idx + 1
        }));
      } catch (e) {
        // Not valid JSON, proceed to line-by-line CSV / TXT / Excel export parsing
        rawItems = parseLineByLine(trimmed, defaultPrice);
      }
    } else {
      rawItems = parseLineByLine(trimmed, defaultPrice);
    }
  }

  // Deduplicate and validate candidates
  for (let idx = 0; idx < rawItems.length; idx++) {
    const raw = rawItems[idx];
    const lineNum = raw.line || idx + 1;
    const numStr = (raw.card_number || "").toString().trim();
    let passStr = (raw.card_password || "").toString().trim();
    if (!passStr) passStr = numStr; // Fallback password to card number if single code used

    const { packageName, price } = resolvePackageAndPrice(raw.package_name, raw.price, defaultPrice);

    if (!numStr || numStr.length < 2) {
      errors.push({
        line: lineNum,
        card_number: numStr,
        reason: "رقم الكرت غير مكتمل أو فارغ"
      });
      continue;
    }

    const numStrLower = numStr.toLowerCase();
    const passStrLower = passStr.toLowerCase();
    
    const isNoise = (v: string): boolean => {
      if (!v) return true;
      const val = v.toLowerCase().trim().replace(/^[:=؛\-/.]+|[:=؛\-/.]+$/g, '');
      if (val.length === 0) return true;
      if (/^(http|https|www\.)/i.test(val)) return true;

      const noiseKeywords = new Set([
        'pdf', 'page', 'table', 'user', 'users', 'pass', 'password', 'username', 'pin', 'secret',
        'mikrotik', 'wifi', 'wi-fi', 'hotspot', 'http', 'https', 'www', 'com', 'org', 'net',
        'serial', 'active', 'expired', 'profile', 'limit', 'uptime', 'bytes', 'download',
        'upload', 'index', 'status', 'date', 'time', 'no', 'num', 'number', 'count',
        'price', 'cost', 'total', 'header', 'footer', 'report', 'voucher', 'batch',
        'generated', 'internet', 'manager', 'login', 'logout', 'router', 'gateway',
        'hours', 'hour', 'hrs', 'hr', 'mb', 'gb', 'kb', 'nis', 'ils', 'speed', 'validity', 'expiry',
        'اسم', 'المستخدم', 'اسم_المستخدم', 'كلمة', 'المرور', 'كلمة_المرور', 'الرمز',
        'الباسورد', 'السر', 'الباقة', 'تسلسل', 'الرقم', 'الصفحة', 'كروت', 'مخزون',
        'بطاقة', 'بطاقات', 'تقرير', 'تاريخ', 'السعر', 'سعر', 'الوقت', 'الحالة', 'التحميل',
        'الرفع', 'ميكروتك', 'شبكة', 'وايفاي', 'صفحة', 'عدد', 'مسلسل', 'ملاحظات', 'ملاحظة',
        'ساعة', 'ساعات', 'شيكل', 'جيجا', 'ميجا', 'تنبيه', 'صلاحية', 'السرعة', 'أهلاً', 'وسهلاً', 'شكراً', 'شكرا'
      ]);

      if (noiseKeywords.has(val)) return true;
      if (/^(page|صفحة)\s*\d+$/i.test(val)) return true;
      if (/^\d+(\.\d+)?\s*(mb|gb|kb|h|hr|hrs|ساعة|ساعات|شيكل|nis|ils|₪)$/i.test(val)) return true;
      return false;
    };

    if (isNoise(numStr) || isNoise(passStr)) {
      // Strictly ignore headers and noise rows
      continue;
    }

    if (seenCardNumbers.has(numStrLower)) {
      errors.push({
        line: lineNum,
        card_number: numStr,
        reason: "رقم الكرت مكرر في نفس ملف الاستيراد"
      });
      continue;
    }

    seenCardNumbers.add(numStr.toLowerCase());
    validCards.push({
      card_number: numStr,
      card_password: passStr,
      price,
      package_name: packageName,
      batch_id: batchId,
      line_number: lineNum
    });
  }

  return {
    validCards,
    errors,
    totalParsed: rawItems.length
  };
}

function parseLineByLine(text: string, defaultPrice: number) {
  const lines = text.split(/\r?\n/);
  const items: Array<{
    card_number: string;
    card_password: string;
    package_name?: string;
    price?: number;
    line: number;
  }> = [];

  let headerIndices: {
    numberIdx?: number;
    passwordIdx?: number;
    packageIdx?: number;
    priceIdx?: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineStr = lines[i].trim();
    if (!lineStr) continue;

    const lower = lineStr.toLowerCase();
    const isHeaderCandidate =
      lower.includes("card_number") ||
      lower.includes("username") ||
      lower.includes("code") ||
      lower.includes("كود") ||
      lower.includes("رقم الكرت") ||
      lower.includes("كلمة السر") ||
      lower.includes("باقة") ||
      lower.includes("package");

    // Check if line 1 is header line
    if (i === 0 && isHeaderCandidate) {
      const cols = lineStr.split(/[\t,;:]+/).map(c => c.trim().toLowerCase());
      headerIndices = {};
      cols.forEach((col, idx) => {
        if (col.includes("number") || col.includes("username") || col.includes("code") || col.includes("كود") || col.includes("رقم")) {
          if (headerIndices!.numberIdx === undefined) headerIndices!.numberIdx = idx;
        } else if (col.includes("password") || col.includes("pin") || col.includes("pass") || col.includes("السر")) {
          if (headerIndices!.passwordIdx === undefined) headerIndices!.passwordIdx = idx;
        } else if (col.includes("package") || col.includes("baga") || col.includes("باقة") || col.includes("نوع")) {
          if (headerIndices!.packageIdx === undefined) headerIndices!.packageIdx = idx;
        } else if (col.includes("price") || col.includes("cost") || col.includes("سعر") || col.includes("قيم")) {
          if (headerIndices!.priceIdx === undefined) headerIndices!.priceIdx = idx;
        }
      });
      continue;
    }

    if (i === 0 && isHeaderCandidate) continue;

  const tokens = lineStr
    .split(/[\t,;:]+/)
    .map(t => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) continue;

  // Drop common header row patterns
  const firstTokenLower = tokens[0].toLowerCase();
  if (
    firstTokenLower === "username" || 
    firstTokenLower === "password" || 
    firstTokenLower === "package" ||
    firstTokenLower === "user" ||
    firstTokenLower === "pass" ||
    firstTokenLower === "code" ||
    firstTokenLower === "اسم المستخدم" ||
    firstTokenLower === "كلمة السر"
  ) {
    continue;
  }

    let card_number = "";
    let card_password = "";
    let rawPkg: string | undefined = undefined;
    let rawPrice: number | undefined = undefined;

    if (headerIndices && (headerIndices.numberIdx !== undefined || headerIndices.passwordIdx !== undefined)) {
      const numIdx = headerIndices.numberIdx ?? 0;
      const passIdx = headerIndices.passwordIdx ?? (tokens.length > 1 ? 1 : numIdx);
      card_number = tokens[numIdx] || "";
      card_password = tokens[passIdx] || card_number;

      if (headerIndices.packageIdx !== undefined && tokens[headerIndices.packageIdx]) {
        rawPkg = tokens[headerIndices.packageIdx];
      }
      if (headerIndices.priceIdx !== undefined && tokens[headerIndices.priceIdx]) {
        const p = parseFloat(tokens[headerIndices.priceIdx]);
        if (!isNaN(p)) rawPrice = p;
      }
    } else {
      // General token assignment without explicit header line
      card_number = tokens[0];
      card_password = tokens.length > 1 ? tokens[1] : card_number;

      if (tokens.length >= 4) {
        // [card_number, card_password, package, price] or vice versa
        const p3 = parseFloat(tokens[2]);
        const p4 = parseFloat(tokens[3]);
        if (!isNaN(p4) && isNaN(p3)) {
          rawPkg = tokens[2];
          rawPrice = p4;
        } else if (!isNaN(p3) && isNaN(p4)) {
          rawPrice = p3;
          rawPkg = tokens[3];
        } else {
          rawPkg = tokens[2];
          if (!isNaN(p4)) rawPrice = p4;
        }
      } else if (tokens.length === 3) {
        const val3 = tokens[2];
        const num3 = parseFloat(val3);
        if (!isNaN(num3) && (num3 === 2 || num3 === 3 || num3 === 5 || num3 === 7 || num3 === 15 || num3 === 50)) {
          rawPrice = num3;
        } else {
          rawPkg = val3;
        }
      } else if (tokens.length === 1) {
        // Space separated token fallback
        const spaceParts = tokens[0].split(/\s+/).filter(Boolean);
        if (spaceParts.length >= 3) {
          card_number = spaceParts[0];
          card_password = spaceParts[1];
          rawPkg = spaceParts[2];
        } else if (spaceParts.length === 2) {
          card_number = spaceParts[0];
          card_password = spaceParts[1];
        }
      }
    }

    const { packageName, price } = resolvePackageAndPrice(rawPkg, rawPrice, defaultPrice);

    items.push({
      card_number,
      card_password,
      package_name: packageName,
      price,
      line: i + 1
    });
  }

  return items;
}
