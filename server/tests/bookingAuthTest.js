import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import { getJwtSecret } from '../middleware/authMiddleware.js';

const BASE_URL = 'http://127.0.0.1:5000/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, description) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedTests++;
  }
};

const runSuite = async () => {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING AI PARKSLOT BOOKING AUTHENTICATION VERIFICATION SUITE');
  console.log('=============================================================\n');

  try {
    // 1. Verify Environment and Secret Consistency
    console.log('--- 1. Secret Consistency Verification ---');
    const secret = getJwtSecret();
    assert(Boolean(secret && secret.length > 10), 'getJwtSecret returns valid secret key');
    assert(secret === process.env.JWT_SECRET, 'authMiddleware getJwtSecret matches process.env.JWT_SECRET');

    // 2. Test Unauthenticated Booking Creation (Must return 401)
    console.log('\n--- 2. Unauthenticated Booking Protection (Must return 401) ---');
    const unauthRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venueId: '60d0fe4f5311236168a109ca',
        slotId: '60d0fe4f5311236168a109cb',
        vehicleNumber: 'MP 04 CB 9999',
        startTime: new Date().toISOString()
      })
    });
    const unauthData = await unauthRes.json();
    assert(unauthRes.status === 401, `Unauthenticated POST /api/bookings returns HTTP 401 (got ${unauthRes.status})`);
    assert(unauthData.success === false, 'Unauthenticated response has success: false');
    assert(unauthData.message.includes('Authentication required') || unauthData.message.includes('log in'), 'Unauthenticated response instructs user to log in');

    // 3. Test Invalid / Malformed Token (Must return 401)
    console.log('\n--- 3. Invalid / Corrupted Token Handling (Must return 401) ---');
    const invalidTokenRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature'
      },
      body: JSON.stringify({
        venueId: '60d0fe4f5311236168a109ca',
        slotId: '60d0fe4f5311236168a109cb',
        vehicleNumber: 'MP 04 CB 9999',
        startTime: new Date().toISOString()
      })
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(invalidTokenRes.status === 401, `Invalid token POST /api/bookings returns HTTP 401 (got ${invalidTokenRes.status})`);
    assert(invalidTokenData.message === 'Session expired or invalid token. Please log in again.', 'Invalid token returns exact expected session expired message');

    // 4. Test Regular User Registration & Authentication
    console.log('\n--- 4. User Registration and Login Flow ---');
    const testEmail = `testdriver_${Date.now()}@aiparkslot.com`;
    const testPhone = `98260${Math.floor(10000 + Math.random() * 90000)}`;
    const testPassword = 'Password@123';

    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Driver User',
        email: testEmail,
        password: testPassword,
        phone: testPhone,
        vehicleNumber: 'MP 04 TD 7788',
        vehicleType: 'car'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, 'Registration returns HTTP 201 and valid JWT');
    const userToken = regData.token;
    const testUserId = regData.user.id;

    // Test Login with newly registered credentials
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success, 'Login succeeds with HTTP 200');
    assert(Boolean(loginData.token), 'Login returns token');
    assert(loginData.user.role === 'user', 'Login returns regular user role');

    // Test /api/auth/me with login token
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.user.email === testEmail, '/api/auth/me verifies user identity successfully');

    // 5. Test Finding a Vacant Slot and Creating a Booking
    console.log('\n--- 5. End-to-End Vacant Slot Booking Creation ---');
    // Fetch venues
    const venuesRes = await fetch(`${BASE_URL}/venues`);
    const venuesData = await venuesRes.json();
    assert(venuesData.success && venuesData.data.length > 0, 'Fetched active venues');
    const targetVenue = venuesData.data[0];

    // Fetch slots for this venue
    const slotsRes = await fetch(`${BASE_URL}/slots/venue/${targetVenue._id}`);
    const slotsData = await slotsRes.json();
    assert(slotsData.success && slotsData.data.length > 0, `Fetched slots for venue ${targetVenue.name}`);

    // Pick a vacant slot
    const vacantSlot = slotsData.data.find(s => s.status === 'vacant');
    assert(Boolean(vacantSlot), `Identified vacant slot for booking (${vacantSlot?.slotNumber})`);

    const bookingPayload = {
      venueId: targetVenue._id,
      slotId: vacantSlot._id,
      userName: 'Test Driver User',
      userPhone: testPhone,
      vehicleNumber: 'MP 04 TD 7788',
      vehicleType: vacantSlot.type || 'car',
      startTime: new Date().toISOString(),
      estimatedHours: 2,
      paymentMethod: 'UPI'
    };

    const bookRes = await fetch(`${BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(bookingPayload)
    });

    const bookData = await bookRes.json();
    assert(bookRes.status === 201, `POST /api/bookings succeeded with HTTP 201 (got ${bookRes.status})`);
    assert(bookData.success === true, 'Booking response has success: true');
    assert(Boolean(bookData.booking && bookData.booking.bookingCode), `Booking reference generated: ${bookData.booking?.bookingCode}`);
    assert(Boolean(bookData.booking.entryQrImage && bookData.booking.exitQrImage), 'Dual-QR code images generated successfully');
    assert(bookData.booking.slotNumber === vacantSlot.slotNumber, `Booking assigned to correct slot (${vacantSlot.slotNumber})`);

    // Verify slot status was updated to 'reserved' in MongoDB
    const updatedSlotsRes = await fetch(`${BASE_URL}/slots/venue/${targetVenue._id}`);
    const updatedSlotsData = await updatedSlotsRes.json();
    const targetSlotAfter = updatedSlotsData.data.find(s => s._id === vacantSlot._id);
    assert(targetSlotAfter.status === 'reserved', `Slot ${targetSlotAfter.slotNumber} immediately marked as 'reserved' on hold`);
    assert(targetSlotAfter.activeVehicleNumber === 'MP 04 TD 7788', `Slot active vehicle updated to MP 04 TD 7788`);

    // 6. Test Private Booking Access vs Other User Protection
    console.log('\n--- 6. Privacy & Role Authorization Checks ---');
    // Regular user fetches /api/bookings -> sees their own booking
    const myBookingsRes = await fetch(`${BASE_URL}/bookings`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const myBookingsData = await myBookingsRes.json();
    assert(myBookingsRes.status === 200, 'GET /api/bookings returns HTTP 200');
    assert(myBookingsData.data.every(b => String(b.userId) === String(testUserId)), 'Regular user ONLY receives their own bookings');

    // Regular user attempting to access another user endpoint /api/bookings/user/:otherId
    const otherUserAccessRes = await fetch(`${BASE_URL}/bookings/user/6ad85036cf0c3959d76649a2`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    assert(otherUserAccessRes.status === 403, 'Regular user cannot view other user private bookings (returns HTTP 403)');

    // Regular user attempting to access admin route /api/admin/stats
    const userAdminRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    assert(userAdminRes.status === 403, 'Regular user cannot access admin endpoints (returns HTTP 403)');

    // 7. Test Admin Authorization
    console.log('\n--- 7. Administrator Authorization Verification ---');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'aiparkingslotadmin@gmail.com',
        password: 'aiparkingslotadmin123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLoginData.user.role === 'admin', 'Admin login succeeds with admin role');
    const adminToken = adminLoginData.token;

    const adminStatsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminStatsData = await adminStatsRes.json();
    assert(adminStatsRes.status === 200 && adminStatsData.success, 'Admin successfully accesses /api/admin/stats');

    // Clean up created test booking so slot returns to vacant
    console.log('\n--- 8. Cleanup and Cancellation Test ---');
    const cancelRes = await fetch(`${BASE_URL}/bookings/${bookData.booking._id}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.success, 'Booking successfully cancelled by user');

    // Verify slot reverted to vacant
    const slotAfterCancelRes = await fetch(`${BASE_URL}/slots/venue/${targetVenue._id}`);
    const slotAfterCancelData = await slotAfterCancelRes.json();
    const slotCleaned = slotAfterCancelData.data.find(s => s._id === vacantSlot._id);
    assert(slotCleaned.status === 'vacant', `Slot ${slotCleaned.slotNumber} returned to vacant status after cancellation`);

    console.log('\n=============================================================');
    console.log(`📊 FINAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
    console.log('=============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test suite fatal error:', err);
    process.exit(1);
  }
};

runSuite();
