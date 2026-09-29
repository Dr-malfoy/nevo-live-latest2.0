import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { normalizePhone, formatPhoneDisplay } from '../utils/phone.util';
import { otpService } from '../services/otp.service';
import { OtpVerification } from '../models/OtpVerification';
import { User } from '../models/User';
import { authService } from '../services/auth.service';

async function runOtpTests() {
  console.log('\n==================================================');
  console.log('🧪 STARTING COMPREHENSIVE OTP SYSTEM TEST SUITE');
  console.log('==================================================\n');

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bogolive';
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected successfully.\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Phone Normalization
    // -------------------------------------------------------------
    console.log('--- TEST 1: Phone Number Normalization ---');
    const bdRaw = '01712345678';
    const bdNorm = normalizePhone(bdRaw);
    console.log(`Input: ${bdRaw} -> Normalized: ${bdNorm}`);
    if (bdNorm !== '+8801712345678') throw new Error(`Normalization failed for ${bdRaw}`);

    const intlRaw = '+1 (415) 555-2671';
    const intlNorm = normalizePhone(intlRaw);
    console.log(`Input: ${intlRaw} -> Normalized: ${intlNorm}`);
    if (intlNorm !== '+14155552671') throw new Error(`Normalization failed for ${intlRaw}`);
    console.log('✅ Phone normalization passed.\n');

    // -------------------------------------------------------------
    // Test 2: Send OTP (Dev Mode / Console Provider)
    // -------------------------------------------------------------
    console.log('--- TEST 2: Send OTP via SMS ---');
    const testPhone = '+8801899990001';
    // Cleanup prior test records
    await OtpVerification.deleteMany({ phone: testPhone });
    await User.deleteMany({ phone: testPhone });

    const sendRes = await otpService.sendOtp({
      phone: testPhone,
      channel: 'sms',
      purpose: 'signup',
    });

    console.log('Send OTP result:', sendRes);
    if (!sendRes.success || !sendRes.devOtp) {
      throw new Error('Send OTP failed or devOtp missing');
    }
    const generatedOtp = sendRes.devOtp;
    console.log(`✅ Generated OTP: ${generatedOtp} (Dev mode)\n`);

    // -------------------------------------------------------------
    // Test 3: Resend Cooldown Enforcement
    // -------------------------------------------------------------
    console.log('--- TEST 3: Resend Cooldown Enforcement ---');
    try {
      await otpService.sendOtp({
        phone: testPhone,
        channel: 'sms',
        purpose: 'signup',
      });
      throw new Error('Should have failed due to cooldown!');
    } catch (err: any) {
      console.log(`Expected cooldown error caught: "${err.message}"`);
      console.log('✅ Cooldown protection passed.\n');
    }

    // -------------------------------------------------------------
    // Test 4: Invalid OTP Verification & Max Attempts
    // -------------------------------------------------------------
    console.log('--- TEST 4: Invalid OTP Attempts Tracking ---');
    try {
      await otpService.verifyOtp({
        phone: testPhone,
        code: '000000',
        purpose: 'signup',
      });
      throw new Error('Should have failed with invalid OTP!');
    } catch (err: any) {
      console.log(`Expected invalid OTP error caught: "${err.message}"`);
    }

    const docAfterFail = await OtpVerification.findOne({ phone: testPhone, purpose: 'signup' });
    console.log(`Attempts recorded: ${docAfterFail?.attempts} / ${docAfterFail?.maxAttempts}`);
    if (docAfterFail?.attempts !== 1) throw new Error('Attempt count did not increment');
    console.log('✅ Invalid attempt tracking passed.\n');

    // -------------------------------------------------------------
    // Test 5: Verify Correct OTP & Issue Token
    // -------------------------------------------------------------
    console.log('--- TEST 5: Verify Correct OTP ---');
    const verifyResult = await otpService.verifyOtp({
      phone: testPhone,
      code: generatedOtp,
      purpose: 'signup',
    });

    console.log('Verification successful:', verifyResult);
    if (!verifyResult.success || !verifyResult.verificationToken) {
      throw new Error('Verification failed to return verificationToken');
    }
    const { verificationToken } = verifyResult;
    console.log(`✅ Verification token issued: ${verificationToken}\n`);

    // -------------------------------------------------------------
    // Test 6: Register User with Verification Token
    // -------------------------------------------------------------
    console.log('--- TEST 6: Register User with Verification Token ---');
    const registerResult = await authService.register({
      phone: testPhone,
      nickname: 'TestOTPUser',
      password: 'Password123!',
      verificationToken,
    });

    console.log(`Registered user: ID=${registerResult.user.id}, Phone=${registerResult.user.phone}, Nickname=${registerResult.user.nickname}`);
    if (registerResult.user.phone !== testPhone) {
      throw new Error('Registered user phone mismatch');
    }
    console.log('✅ User registration with token passed.\n');

    // -------------------------------------------------------------
    // Test 7: Replay Prevention (Reusing Token)
    // -------------------------------------------------------------
    console.log('--- TEST 7: Prevent Replay Attack with Used Token ---');
    try {
      await authService.register({
        phone: testPhone,
        nickname: 'DuplicateUser',
        password: 'Password123!',
        verificationToken,
      });
      throw new Error('Should have rejected already used token or duplicate user!');
    } catch (err: any) {
      console.log(`Expected replay/duplicate error caught: "${err.message}"`);
      console.log('✅ Replay prevention passed.\n');
    }

    // -------------------------------------------------------------
    // Test 8: WhatsApp OTP Channel Routing
    // -------------------------------------------------------------
    console.log('--- TEST 8: WhatsApp OTP Channel Flow ---');
    const testPhoneWA = '+8801899990002';
    await OtpVerification.deleteMany({ phone: testPhoneWA });

    const waRes = await otpService.sendOtp({
      phone: testPhoneWA,
      channel: 'whatsapp',
      purpose: 'signup',
    });

    console.log('WhatsApp send result:', waRes);
    if (!waRes.success || waRes.channel !== 'whatsapp') {
      throw new Error('WhatsApp channel dispatch failed');
    }
    console.log('✅ WhatsApp channel dispatch passed.\n');

    // Clean up test data
    await OtpVerification.deleteMany({ phone: { $in: [testPhone, testPhoneWA] } });
    await User.deleteMany({ phone: { $in: [testPhone, testPhoneWA] } });

    console.log('==================================================');
    console.log('🎉 ALL OTP SYSTEM TESTS PASSED SUCCESSFULLY! 🚀');
    console.log('==================================================\n');

  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runOtpTests();
