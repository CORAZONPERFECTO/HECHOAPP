import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanUndefined(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => cleanUndefined(item));
    }
    
    // If it's not a plain object (e.g. Date, Timestamp, FieldValue), return as-is
    const proto = Object.getPrototypeOf(obj);
    const isPlain = proto === null || proto === Object.prototype;
    if (!isPlain) {
        return obj;
    }
    
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
            cleaned[key] = cleanUndefined(val);
        }
    });
    return cleaned;
}

