/**
 * SMS Reader Bridge — calls the native Android SMS Capacitor plugin.
 * On web (non-Android), all functions are no-ops.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// The native plugin interface
interface SmsReaderPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
  readAllSms(options: { maxMessages?: number }): Promise<{ messages: SmsMessage[] }>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
}

export interface SmsMessage {
  id: string;
  sender: string;
  body: string;
  date: number; // Unix timestamp ms
}

// Register the native plugin (only active when running in Android)
const SmsReader = registerPlugin<SmsReaderPlugin>('SmsReader');

/** Returns true if running inside the native Android app */
export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** Request SMS read permission. Returns true if granted. */
export async function requestSmsPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const { granted } = await SmsReader.requestPermission();
    return granted;
  } catch {
    return false;
  }
}

/** Check if SMS permission is currently granted. */
export async function checkSmsPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const { granted } = await SmsReader.checkPermission();
    return granted;
  } catch {
    return false;
  }
}

/** Read all SMS messages from the inbox (up to maxMessages). */
export async function readAllSms(maxMessages = 500): Promise<SmsMessage[]> {
  if (!isNativeAndroid()) return [];
  try {
    const { messages } = await SmsReader.readAllSms({ maxMessages });
    return messages;
  } catch {
    return [];
  }
}

/**
 * Filter messages to only financial bank SMS.
 * Matches common Indian bank sender patterns.
 */
export function filterBankSms(messages: SmsMessage[]): SmsMessage[] {
  const BANK_SENDERS = [
    'HDFCBK', 'HDFCBANK', 'SBIBNK', 'SBIPSG', 'ICICIB', 'ICICIBK',
    'AXISBK', 'KOTAKB', 'INDBNK', 'PNBSMS', 'BOIIND', 'CANBNK',
    'YESBNK', 'IDBIBK', 'FEDBK',  'SCBANK', 'RBLBNK', 'UCOBNK',
    'PAYTM',  'GPAY',   'PHONEPE','AMAZON', 'FLIPKRT', 'BARODA', 'BOBSMS', 'BOB'
  ];

  const FINANCIAL_KEYWORDS = [
    'debited', 'credited', 'debit', 'credit', 'dr.', 'dr ', 'cr.', 'cr ',
    'sent', 'received', 'paid', 'payment',
    'UPI', 'NEFT', 'IMPS', 'RTGS',
    'Rs.', 'INR', 'A/c', 'Amt'
  ];

  return messages.filter(msg => {
    const senderUpper = (msg.sender || '').toUpperCase();
    const bodyUpper = (msg.body || '').toUpperCase();

    const isBankSender = BANK_SENDERS.some(s => senderUpper.includes(s));
    const hasFinancialKeyword = FINANCIAL_KEYWORDS.some(k => 
      bodyUpper.includes(k.toUpperCase())
    );

    return isBankSender || hasFinancialKeyword;
  });
}

/** Start listening for new incoming SMS messages. */
export async function startSmsListener(): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await SmsReader.startListening();
  } catch {
    // Silently fail on web
  }
}

/** Stop listening for new SMS messages. */
export async function stopSmsListener(): Promise<void> {
  if (!isNativeAndroid()) return;
  try {
    await SmsReader.stopListening();
  } catch {
    // Silently fail on web
  }
}
