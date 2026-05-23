/**
 * Dominican Republic Tax & Fiscal Document Validation Library
 * Includes validation for:
 * 1. RNC (Registro Nacional de Contribuyentes) - 9 digits (Modulo 11)
 * 2. Cédula de Identidad y Electoral - 11 digits (Modulo 10)
 * 3. e-NCF (Comprobante Fiscal Electrónico) - E + 10 digits
 * 4. NCF (Comprobante Fiscal Tradicional) - B + 10 digits
 */

/**
 * Validates a 9-digit RNC using the Modulo 11 check-digit algorithm.
 */
export function validateRNC(rnc: string): boolean {
    const clean = rnc.replace(/[^\d]/g, '');
    if (clean.length !== 9) return false;

    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += parseInt(clean[i], 10) * weights[i];
    }

    const remainder = sum % 11;
    let checkDigit = 0;
    if (remainder === 0) {
        checkDigit = 2;
    } else if (remainder === 1) {
        checkDigit = 1;
    } else {
        checkDigit = 11 - remainder;
    }

    return checkDigit === parseInt(clean[8], 10);
}

/**
 * Validates an 11-digit Cédula using the JCE Modulo 10 algorithm.
 */
export function validateCedula(cedula: string): boolean {
    const clean = cedula.replace(/[^\d]/g, '');
    if (clean.length !== 11) return false;

    // Reject known test patterns
    if (/^000+$/.test(clean)) return false;

    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let val = parseInt(clean[i], 10) * weights[i];
        if (val >= 10) {
            val = Math.floor(val / 10) + (val % 10);
        }
        sum += val;
    }

    const remainder = sum % 10;
    let checkDigit = 0;
    if (remainder === 0) {
        checkDigit = 0;
    } else {
        checkDigit = 10 - remainder;
    }

    return checkDigit === parseInt(clean[10], 10);
}

/**
 * Validates a tax ID that can be either an RNC (9 digits) or a Cédula (11 digits).
 */
export function validateRNCorCedula(id: string): boolean {
    const clean = id.replace(/[^\d]/g, '');
    if (clean.length === 9) {
        return validateRNC(clean);
    } else if (clean.length === 11) {
        return validateCedula(clean);
    }
    return false;
}

/**
 * Validates an Electronic NCF (e-NCF).
 * Format: starts with 'E', followed by exactly 10 digits.
 */
export function validateENCF(eNcf: string): boolean {
    const clean = eNcf.trim().toUpperCase();
    return /^E\d{10}$/.test(clean);
}

/**
 * Validates a Traditional NCF.
 * Format: starts with 'B', followed by exactly 10 digits.
 */
export function validateNCF(ncf: string): boolean {
    const clean = ncf.trim().toUpperCase();
    return /^B\d{10}$/.test(clean);
}
