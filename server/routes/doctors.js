// server/routes/doctors.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/user');
const Photo = require('../models/Photo');
const Connection = require('../models/Connection');
const Notification = require('../models/Notification');
const Room = require('../models/Room');
const Session = require('../models/Session');
const { verifyToken, requireDoctor, requireUser } = require('../middleware/auth');

/* ---------------------------------------------
   Helper Functions
---------------------------------------------- */
const oid = (v) => new mongoose.Types.ObjectId(String(v));

function doctorMatch(userId) {
  // userId can be ObjectId or string - handle both
  const idObj = userId instanceof mongoose.Types.ObjectId ? userId : oid(String(userId));
  const idStr = String(userId);
  const idObjStr = String(idObj);
  
  // Return query that matches both doctorId and doctor fields in all formats
  return {
    $or: [
      // Match doctorId field
      { doctorId: idObj },
      { doctorId: idStr },
      { doctorId: idObjStr },
      // Match doctor field (legacy)
      { doctor: idObj },
      { doctor: idStr },
      { doctor: idObjStr },
    ],
  };
}

function userMatch(userId) {
  const idObj = oid(userId);
  const idStr = String(userId);
  return {
    $or: [
      { userId: idObj },
      { user: idObj },
      { userId: idStr },
      { user: idStr },
    ],
  };
}

async function attachLatestFootPhoto(sessionDoc) {
  const uid = oid(sessionDoc.userId);
  let latest = null;

  try {
    const A = await Photo.aggregate([
      { $match: { userId: uid } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ]);
    latest = A[0] || null;
  } catch (e) {
    console.log('attachLatestFootPhoto[A] warn:', e.message);
  }

  if (!latest) {
    try {
      const B = await Photo.aggregate([
        { $match: { user: uid } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
      ]);
      latest = B[0] || null;
    } catch (e) {
      console.log('attachLatestFootPhoto[B] warn:', e.message);
    }
  }

  if (latest?.annotated) {
    sessionDoc.feetPhotoUrl = latest.annotated;
  } else if (latest?.filepath) {
    sessionDoc.feetPhotoUrl = latest.filepath;
  }
}

/* ---------------------------------------------
   Helper: create/ensure a pending connection
   - Saves BOTH field shapes
   - Creates/updates a pending Session tied to the request (with optional intake)
---------------------------------------------- */
async function createOrPendConnection({ userId, doctorId, intake, doctorExactId }) {
  // Use doctorExactId if provided (from database query), otherwise query again
  let doctor;
  let doctorActualId;
  
  if (doctorExactId) {
    // Use the exact ObjectId passed in (matches JWT token)
    doctorActualId = doctorExactId;
    doctor = { _id: doctorExactId };
    console.log('✅ Using provided doctorExactId:', String(doctorActualId));
  } else {
    // Fallback: query database
    doctor = await User.findOne({ _id: doctorId, role: 'doctor', isApproved: true }).select('_id').lean();
    if (!doctor) {
      return { ok: false, status: 404, message: 'Doctor not found/approved' };
    }
    doctorActualId = doctor._id; // This is the ObjectId from database
  }

  // CRITICAL: Use doctorActualId (ObjectId) for notifications - this matches JWT token
  // The JWT contains user._id as ObjectId, so notifications MUST use the same ObjectId
  const doctorStr = String(doctorActualId);
  const doctorObjId = doctorActualId instanceof mongoose.Types.ObjectId 
    ? doctorActualId 
    : oid(String(doctorActualId)); // Ensure it's an ObjectId
  const userStr = String(userId);
  const userObjId = oid(userStr);
  
  console.log('🔑 createOrPendConnection - Using doctor ID:', {
    doctorActualId: String(doctorActualId),
    doctorStr: doctorStr,
    doctorObjId: String(doctorObjId),
    isObjectId: doctorActualId instanceof mongoose.Types.ObjectId,
    doctorObjIdType: doctorObjId instanceof mongoose.Types.ObjectId ? 'ObjectId' : typeof doctorObjId,
  });

  const userFieldValues = [userObjId, userStr];
  const doctorFieldValues = [doctorObjId, doctorStr];

  const userFieldQuery = { $in: userFieldValues };
  const doctorFieldQuery = { $in: doctorFieldValues };

  const connectionMatch = {
    $or: [
      { userId: userFieldQuery, doctorId: doctorFieldQuery },
      { userId: userFieldQuery, doctor: doctorFieldQuery },
      { user: userFieldQuery, doctorId: doctorFieldQuery },
      { user: userFieldQuery, doctor: doctorFieldQuery },
    ],
  };

  // Find existing connection (either shape)
  let conn = await Connection.findOne(connectionMatch);

  let sessionId = null;

  if (!conn) {
    // Create new connection
    conn = new Connection({
      userId: userObjId,
      doctorId: doctorObjId,
      user: userObjId,
      doctor: doctorObjId,
      status: 'pending',
      requestedAt: new Date(),
    });
    await conn.save();
    console.log('🧩 Created connection:', {
      _id: String(conn._id),
      userId: String(conn.userId || conn.user),
      doctorId: String(conn.doctorId || conn.doctor),
      doctorIdType: typeof conn.doctorId,
      doctorType: typeof conn.doctor,
      status: conn.status,
      allFields: {
        userId: conn.userId ? String(conn.userId) : null,
        user: conn.user ? String(conn.user) : null,
        doctorId: conn.doctorId ? String(conn.doctorId) : null,
        doctor: conn.doctor ? String(conn.doctor) : null,
      },
    });
    
    // VERIFY: Immediately check if connection can be found by doctorMatch
    // Try with both ObjectId and string formats
    const testMatch1 = { status: 'pending', ...doctorMatch(doctorObjId) };
    const testMatch2 = { status: 'pending', ...doctorMatch(doctorStr) };
    const testFind1 = await Connection.findOne(testMatch1).lean();
    const testFind2 = await Connection.findOne(testMatch2).lean();
    const testFind = testFind1 || testFind2;
    
    console.log('🔍 VERIFY - Connection can be found by doctorMatch:', {
      found: !!testFind,
      connectionId: testFind ? String(testFind._id) : 'NOT FOUND',
      foundWithObjId: !!testFind1,
      foundWithString: !!testFind2,
      savedDoctorId: String(conn.doctorId || conn.doctor),
      savedDoctorIdType: typeof (conn.doctorId || conn.doctor),
      matchQuery1: JSON.stringify(testMatch1, null, 2),
      matchQuery2: JSON.stringify(testMatch2, null, 2),
    });

    // Create pending session
    try {
      let session = await Session.findOne({
        userId: userFieldQuery,
        doctorId: doctorFieldQuery,
        status: 'pending',
      }).sort({ createdAt: -1 });

      if (!session) {
        session = new Session({
          userId: userObjId,
          doctorId: doctorObjId,
          status: 'pending',
          marmaPlan: [
            { name: 'Marma 1', durationSec: 60, notes: '' },
            { name: 'Marma 2', durationSec: 60, notes: '' },
            { name: 'Marma 3', durationSec: 60, notes: '' },
            { name: 'Marma 4', durationSec: 60, notes: '' },
          ],
        });

        if (intake) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
        }

        await attachLatestFootPhoto(session);
        await session.save();
        sessionId = String(session._id);
        console.log('📋 Created session for therapy request:', {
          sessionId: sessionId,
          hasIntake: !!session.intake,
          intakeFields: session.intake ? Object.keys(session.intake) : [],
          userId: String(session.userId),
          doctorId: String(session.doctorId),
        });
        
        // Verify session was saved with intake data
        const verifySession = await Session.findById(session._id).lean();
        console.log('🔍 Verification - Session saved with intake:', {
          found: !!verifySession,
          hasIntake: !!verifySession?.intake,
          intakeFields: verifySession?.intake ? Object.keys(verifySession.intake) : [],
        });
      } else {
        // Update intake if provided and session exists
        if (intake) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
        }
        sessionId = String(session._id);
      }
    } catch (e) {
      console.error('⚠️ Session creation failed:', e.message);
    }

    // Create notification for new connection
    // CRITICAL: Use the same ID format that the doctor will have in their JWT token
    // The JWT contains user._id which is an ObjectId, so we should use ObjectId for recipientId
    let notificationCreated = false;
    try {
      const Notification = require('../models/Notification');
      
      // CRITICAL: Use doctorObjId (ObjectId) - this MUST match what's in the doctor's JWT token
      // The JWT token has userId: user._id (ObjectId), so recipientId must be the same ObjectId
      const notificationRecipientId = doctorObjId; // Use the ObjectId directly
      const notificationRecipientIdStr = doctorStr; // String version for querying
      
      console.log('🔔 Attempting to create notification for new connection:', {
        recipientId: String(notificationRecipientId),
        recipientIdStr: notificationRecipientIdStr,
        actorId: String(userObjId),
        doctorId: doctorStr,
        doctorActualId: String(doctorActualId),
        isObjectId: notificationRecipientId instanceof mongoose.Types.ObjectId,
      });
      
      const notif = await Notification.create({
        recipientId: notificationRecipientId, // ObjectId - matches JWT token
        recipientIdStr: notificationRecipientIdStr, // String version for queries
        actorId: userObjId,
        type: 'connect_request',
        message: intake 
          ? 'A patient sent a therapy request with intake information'
          : 'A patient sent a therapy request',
        meta: {
          connectionId: conn._id.toString(),
          userId: userStr,
          sessionId: sessionId || null,
        },
      });
      
      notificationCreated = true;
      console.log('✅ Created notification for new connection:', {
        notificationId: String(notif._id),
        recipientId: String(notif.recipientId),
        recipientIdStr: notif.recipientIdStr,
        recipientIdType: typeof notif.recipientId,
        doctorId: doctorStr,
        sessionId: sessionId || null,
      });
      
      // Verify it was saved correctly and can be queried
      const verify = await Notification.findById(notif._id).lean();
      console.log('🔍 Verification - Notification saved:', {
        found: !!verify,
        recipientId: verify ? String(verify.recipientId) : 'N/A',
        recipientIdStr: verify?.recipientIdStr || 'N/A',
      });
      
      // Test query to see if notification can be found by doctor ID
      // The doctor's JWT has userId as ObjectId, so we test with ObjectId first
      const testQuery = await Notification.findOne({
        $or: [
          { recipientId: notificationRecipientId }, // ObjectId - matches JWT
          { recipientId: doctorObjId }, // Also try converted ObjectId
          { recipientId: doctorStr }, // String version (fallback)
          { recipientIdStr: notificationRecipientIdStr }, // String field
          { recipientIdStr: doctorStr }, // Original string
        ],
        type: 'connect_request',
      }).sort({ createdAt: -1 }).lean();
      
      console.log('🔍 Test query - Can find notification for doctor:', {
        found: !!testQuery,
        notificationId: testQuery ? String(testQuery._id) : 'NOT FOUND',
        createdNotificationId: String(notif._id),
        matches: testQuery ? String(testQuery._id) === String(notif._id) : false,
        recipientId: testQuery ? String(testQuery.recipientId) : 'N/A',
        recipientIdStr: testQuery?.recipientIdStr || 'N/A',
        doctorId: doctorStr,
        doctorActualId: String(doctorActualId),
        queryUsedRecipientId: String(notificationRecipientId),
      });
    } catch (e) {
      console.error('❌ Notification create failed for new connection:', {
        error: e.message,
        stack: e.stack,
        doctorId: doctorStr,
        doctorObjId: String(doctorObjId),
      });
      notificationCreated = false;
    }

    return {
      ok: true,
      message: 'Connection request sent',
      connectionId: String(conn._id),
      sessionId: sessionId,
      notificationCreated: notificationCreated,
    };
  } else if (conn.status === 'rejected') {
    // Re-pend rejected connection
    conn.status = 'pending';
    conn.requestedAt = new Date();
    await conn.save();
    console.log('🧩 Re-pended connection', String(conn._id));

    if (intake) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Session update (re-pend) failed:', e.message);
      }
    }

    if (!sessionId) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Failed to get sessionId:', e.message);
      }
    }

    try {
      // CRITICAL: Use doctorObjId (ObjectId) - matches JWT token format
      const notificationRecipientId = doctorObjId; // ObjectId - matches JWT
      const notificationRecipientIdStr = doctorStr; // String version
      
      console.log('🔔 Creating notification for re-pended connection:', {
        recipientId: String(notificationRecipientId),
        recipientIdStr: notificationRecipientIdStr,
        doctorId: doctorStr,
        hasIntake: !!intake,
        isObjectId: notificationRecipientId instanceof mongoose.Types.ObjectId,
      });
      
      const notif = await Notification.create({
        recipientId: notificationRecipientId, // ObjectId - matches JWT token
        recipientIdStr: notificationRecipientIdStr, // String version
        actorId: userObjId,
        type: 'connect_request',
        message: intake 
          ? 'A patient resubmitted their therapy request with intake information'
          : 'A patient resubmitted their therapy request',
        meta: {
          connectionId: conn._id.toString(),
          userId: userStr,
          sessionId: sessionId || null,
        },
      });
      console.log('✅ Created notification for re-pended request:', {
        notificationId: String(notif._id),
        recipientId: String(notif.recipientId),
        recipientIdStr: notif.recipientIdStr,
        doctorIdProvided: String(doctorId),
        doctorActualId: String(doctorActualId),
      });
    } catch (e) {
      console.error('❌ Notification create failed for re-pend:', {
        error: e.message,
        stack: e.stack,
        doctorId: String(doctorId),
      });
      // Don't fail the request if notification fails, but log the error
    }
  } else if (conn.status === 'accepted') {
    // If connection is accepted but user is sending new intake data, treat it as a new request
    // This allows users to send updated intake information even if already connected
    // Check if intake has any meaningful data (not just an empty object)
    const hasIntakeData = intake && (
      intake.fullName || 
      intake.painDescription || 
      intake.phone ||
      Object.keys(intake).length > 0
    );
    
    if (hasIntakeData) {
      console.log('🔄 Connection is accepted but user sent new intake data - updating to pending and creating notification');
      conn.status = 'pending';
      conn.requestedAt = new Date();
      await conn.save();
      
      // Update or create session with intake data
      try {
        let session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
        }).sort({ createdAt: -1 });
        
        if (!session) {
          session = new Session({
            userId: userObjId,
            doctorId: doctorObjId,
            status: 'pending',
            marmaPlan: [
              { name: 'Marma 1', durationSec: 60, notes: '' },
              { name: 'Marma 2', durationSec: 60, notes: '' },
              { name: 'Marma 3', durationSec: 60, notes: '' },
              { name: 'Marma 4', durationSec: 60, notes: '' },
            ],
          });
        }
        
        session.status = 'pending';
        session.intake = {
          fullName: intake.fullName || '',
          age: intake.age ? Number(intake.age) : null,
          gender: intake.gender || '',
          livingArea: intake.livingArea || '',
          bloodType: intake.bloodType || '',
          painDescription: intake.painDescription || '',
          painLocation: intake.painLocation || '',
          painDuration: intake.painDuration || '',
          painSeverity: intake.painSeverity || '',
          painArea: intake.painArea || intake.painLocation || '',
          problemType: intake.problemType || '',
          phone: intake.phone || '',
          otherNotes: intake.otherNotes || '',
        };
        await session.save();
        sessionId = String(session._id);
        console.log('📋 Updated session with new intake data:', {
          sessionId: sessionId,
          hasIntake: !!session.intake,
        });
      } catch (e) {
        console.error('⚠️ Session update failed for accepted connection:', e.message);
      }
      
      // Create notification for the new request
      try {
        const Notification = require('../models/Notification');
        const notificationRecipientId = doctorObjId;
        const notificationRecipientIdStr = doctorStr;
        
        const notif = await Notification.create({
          recipientId: notificationRecipientId,
          recipientIdStr: notificationRecipientIdStr,
          actorId: userObjId,
          type: 'connect_request',
          message: 'A patient sent a new therapy request with updated intake information',
          meta: {
            connectionId: conn._id.toString(),
            userId: userStr,
            sessionId: sessionId || null,
          },
        });
        console.log('✅ Created notification for new request from accepted connection:', {
          notificationId: String(notif._id),
          recipientId: String(notif.recipientId),
        });
      } catch (e) {
        console.error('❌ Notification create failed:', e.message);
      }
      
      return {
        ok: true,
        message: 'New therapy request sent with updated information',
        connectionId: String(conn._id),
        sessionId: sessionId,
        notificationCreated: true,
      };
    } else {
      // No intake data provided, just return that they're already connected
      return { ok: true, message: 'Already connected to this doctor', already: true };
    }
  } else {
    // Connection already exists and is pending - update session with intake if provided
    if (intake) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });

        if (session) {
          session.intake = {
            fullName: intake.fullName || '',
            age: intake.age ? Number(intake.age) : null,
            gender: intake.gender || '',
            livingArea: intake.livingArea || '',
            bloodType: intake.bloodType || '',
            painDescription: intake.painDescription || '',
            painLocation: intake.painLocation || '',
            painDuration: intake.painDuration || '',
            painSeverity: intake.painSeverity || '',
            painArea: intake.painArea || intake.painLocation || '',
            problemType: intake.problemType || '',
            phone: intake.phone || '',
            otherNotes: intake.otherNotes || '',
          };
          await session.save();
          sessionId = String(session._id);
          console.log('📝 Updated existing pending session intake:', {
            sessionId: sessionId,
            hasIntake: !!session.intake,
            intakeFields: session.intake ? Object.keys(session.intake) : [],
          });
          
          // Verify session was updated
          const verifySession = await Session.findById(session._id).lean();
          console.log('🔍 Verification - Session updated with intake:', {
            found: !!verifySession,
            hasIntake: !!verifySession?.intake,
            intakeFields: verifySession?.intake ? Object.keys(verifySession.intake) : [],
          });
        } else {
          // Create session if it doesn't exist
          try {
            const newSession = new Session({
              userId: userObjId,
              doctorId: doctorObjId,
              status: 'pending',
              marmaPlan: [
                { name: 'Marma 1', durationSec: 60, notes: '' },
                { name: 'Marma 2', durationSec: 60, notes: '' },
                { name: 'Marma 3', durationSec: 60, notes: '' },
                { name: 'Marma 4', durationSec: 60, notes: '' },
              ],
              intake: {
                fullName: intake.fullName || '',
                age: intake.age ? Number(intake.age) : null,
                gender: intake.gender || '',
                livingArea: intake.livingArea || '',
                bloodType: intake.bloodType || '',
                painDescription: intake.painDescription || '',
                painLocation: intake.painLocation || '',
                painDuration: intake.painDuration || '',
                painSeverity: intake.painSeverity || '',
                painArea: intake.painArea || intake.painLocation || '',
                problemType: intake.problemType || '',
                phone: intake.phone || '',
                otherNotes: intake.otherNotes || '',
              },
            });
            await attachLatestFootPhoto(newSession);
            await newSession.save();
            sessionId = String(newSession._id);
            console.log('📋 Created new session for existing pending connection:', sessionId);
          } catch (e) {
            console.error('⚠️ Failed to create session for existing connection:', e.message);
          }
        }
      } catch (e) {
        console.error('⚠️ Session update failed:', e.message);
      }
    }

    if (!sessionId) {
      try {
        const session = await Session.findOne({
          userId: userFieldQuery,
          doctorId: doctorFieldQuery,
          status: 'pending',
        }).sort({ createdAt: -1 });
        if (session) {
          sessionId = String(session._id);
        }
      } catch (e) {
        console.error('⚠️ Failed to get sessionId:', e.message);
      }
    }

    // ALWAYS create notification for existing pending connections (especially when intake is provided)
    // This ensures doctors are notified even if they already have a pending request
    // CRITICAL: Use the doctor's actual _id from database (matches JWT token)
    let notificationCreated = false;
    try {
      // CRITICAL: Use doctorObjId (ObjectId) - this MUST match what's in the doctor's JWT token
      // The JWT token has userId: user._id (ObjectId), so recipientId must be the same ObjectId
      const notificationRecipientId = doctorObjId; // Use the ObjectId directly
      const notificationRecipientIdStr = doctorStr; // String version for querying
      
      console.log('🔔 Creating notification for existing pending connection:', {
        recipientId: String(notificationRecipientId),
        recipientIdStr: notificationRecipientIdStr,
        actorId: String(userObjId),
        doctorId: doctorStr,
        doctorActualId: String(doctorActualId),
        hasIntake: !!intake,
        connectionId: String(conn._id),
        isObjectId: notificationRecipientId instanceof mongoose.Types.ObjectId,
      });
      
      const notif = await Notification.create({
        recipientId: notificationRecipientId, // ObjectId - matches JWT token
        recipientIdStr: notificationRecipientIdStr, // String version for queries
        actorId: userObjId,
        type: 'connect_request',
        message: intake 
          ? 'A patient sent a therapy request with intake information'
          : 'A patient sent a therapy request',
        meta: {
          connectionId: conn._id.toString(),
          userId: userStr,
          sessionId: sessionId || null,
        },
      });
      notificationCreated = true;
      console.log('✅ Created notification for existing pending request:', {
        notificationId: String(notif._id),
        recipientId: String(notif.recipientId),
        recipientIdStr: notif.recipientIdStr,
        recipientIdType: typeof notif.recipientId,
        doctorIdProvided: String(doctorId),
        sessionId: sessionId || null,
      });
      
      // Verify notification can be queried immediately
      const verify = await Notification.findById(notif._id).lean();
      console.log('🔍 Verification - Notification for existing connection saved:', {
        found: !!verify,
        recipientId: verify ? String(verify.recipientId) : 'N/A',
        recipientIdStr: verify?.recipientIdStr || 'N/A',
      });
      
      // Test query to ensure doctor can find it
      const testQuery = await Notification.findOne({
        $or: [
          { recipientId: doctorObjId },
          { recipientId: doctorStr },
          { recipientIdStr: doctorStr },
        ],
        type: 'connect_request',
      }).sort({ createdAt: -1 }).lean();
      
      console.log('🔍 Test query - Can find notification for doctor:', {
        found: !!testQuery,
        notificationId: testQuery ? String(testQuery._id) : 'NOT FOUND',
        matchesCreated: testQuery ? String(testQuery._id) === String(notif._id) : false,
        recipientId: testQuery ? String(testQuery.recipientId) : 'N/A',
        recipientIdStr: testQuery?.recipientIdStr || 'N/A',
        doctorId: doctorStr,
      });
    } catch (e) {
      console.error('❌ Notification create failed for existing connection:', {
        error: e.message,
        stack: e.stack,
        doctorId: String(doctorId),
        doctorIdType: typeof doctorId,
        doctorObjId: String(doctorObjId),
      });
      // Don't fail the request if notification fails, but log the error
    }

    return {
      ok: true,
      message: 'Request sent to doctor',
      already: true,
      connectionId: conn._id.toString(),
      sessionId: sessionId || null,
      notificationCreated,
    };
  }

  // This should never be reached, but just in case
  return {
    ok: false,
    status: 500,
    message: 'Unexpected connection state',
  };
}

/* ---------------------------------------------
   PUBLIC: simple list of approved doctors
   GET /api/doctors
---------------------------------------------- */
router.get('/', async (_req, res) => {
  try {
    const docs = await User.find({ role: 'doctor', isApproved: true })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
      .lean();
    res.json(docs);
  } catch (e) {
    console.error('GET /doctors error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   PUBLIC: searchable, paginated approved doctors
   GET /api/doctors/public?q=&limit=24&page=1
---------------------------------------------- */
router.get('/public', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24));
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const filter = { role: 'doctor', isApproved: true };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { specialization: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) {
    console.error('GET /doctors/public error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   USER: Get connected doctor's full profile
   GET /api/doctors/:id/profile/connected
   Returns full doctor profile for patients who are connected
   NOTE: This must come BEFORE /:id/profile to match correctly
---------------------------------------------- */
router.get('/:id/profile/connected', verifyToken, requireUser, async (req, res) => {
  try {
    const doctorId = req.params.id;
    const userId = req.user.userId;
    const doctorIdObj = oid(doctorId);
    const userIdObj = oid(userId);

    // Check if user is connected to this doctor
    const conn = await Connection.findOne({
      $or: [
        { doctorId: doctorIdObj, userId: userIdObj },
        { doctor: doctorIdObj, user: userIdObj },
      ],
      status: { $in: ['accepted', 'approved'] }
    }).lean();

    if (!conn) {
      return res.status(403).json({ message: 'Not connected to this doctor' });
    }

    // Get doctor's User data
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath createdAt')
      .lean();

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Get doctor's Profile data (if exists)
    const Profile = require('../models/Profile');
    const profile = await Profile.findOne({ userId: doctorIdObj }).lean();

    // Combine User and Profile data
    const avatarUrl = profile?.avatar || doctor.profilePhoto || null;

    res.json({
      id: String(doctor._id),
      _id: String(doctor._id),
      name: doctor.name,
      email: doctor.email,
      profilePhoto: avatarUrl,
      avatarUrl: avatarUrl,
      gender: doctor.gender || profile?.gender || null,
      age: doctor.age || null,
      specialization: doctor.specialization || null,
      qualifications: doctor.qualifications || null,
      bio: doctor.bio || null,
      documentPath: doctor.documentPath || null,
      // Profile extras
      title: profile?.title || null,
      fullName: profile?.fullName || null,
      phone: profile?.phone || null,
      createdAt: doctor.createdAt,
      // Connection info
      connectionStatus: conn.status,
      connectedAt: conn.createdAt || conn.requestedAt,
    });
  } catch (e) {
    console.error('GET /doctors/:id/profile/connected error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   PUBLIC: get a doctor's public profile
   GET /api/doctors/:id/profile
   NOTE: This must come AFTER /:id/profile/connected to match correctly
---------------------------------------------- */
router.get('/:id/profile', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await User.findOne({ _id: id, role: 'doctor', isApproved: true })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath createdAt')
      .lean();
    if (!doc) {
      return res.status(404).json({ message: 'Doctor not found/approved' });
    }
    res.json(doc);
  } catch (e) {
    console.error('GET /doctors/:id/profile error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   USER: Request connect (with optional intake)
   POST /api/doctors/request { doctorId, intake? }
---------------------------------------------- */
router.post('/request', verifyToken, requireUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const doctorId = req.body.doctorId;
    const intake = req.body.intake || null;
    
    console.log('📥 Received therapy request:', {
      userId: String(userId),
      doctorId: String(doctorId || 'missing'),
      hasIntake: !!intake,
    });
    
    if (!doctorId) {
      console.error('❌ Missing doctorId in request');
      return res.status(400).json({ message: 'doctorId required' });
    }

    // Verify doctor exists and get their actual _id
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' }).select('_id').lean();
    if (!doctor) {
      console.error('❌ Doctor not found:', String(doctorId));
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    const actualDoctorId = String(doctor._id);
    console.log('👨‍⚕️ Doctor verified:', {
      requestedDoctorId: String(doctorId),
      actualDoctorId: actualDoctorId,
      match: String(doctorId) === actualDoctorId,
    });

    // CRITICAL: Get the doctor's actual ObjectId from database
    // This MUST match what's in the doctor's JWT token (user._id)
    const doctorDbRecord = await User.findById(actualDoctorId).select('_id').lean();
    if (!doctorDbRecord) {
      console.error('❌ Doctor record not found after verification');
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Use the exact ObjectId from database (this is what's in JWT token)
    const doctorExactId = doctorDbRecord._id;
    console.log('🔑 Using exact doctor ID from database:', {
      doctorId: String(doctorExactId),
      actualDoctorId: actualDoctorId,
      match: String(doctorExactId) === actualDoctorId,
    });
    
    console.log('🔧 Calling createOrPendConnection with:', {
      userId: String(userId),
      doctorId: String(doctorExactId),
      doctorExactId: String(doctorExactId),
      hasIntake: !!intake,
    });
    
    const result = await createOrPendConnection({ 
      userId, 
      doctorId: String(doctorExactId), // Pass as string, function will convert
      doctorExactId: doctorExactId, // Pass the ObjectId directly
      intake 
    });
    
    console.log('🔧 createOrPendConnection result:', {
      ok: result.ok,
      message: result.message,
      connectionId: result.connectionId,
      sessionId: result.sessionId,
      notificationCreated: result.notificationCreated,
    });
    
    if (!result.ok) {
      console.error('❌ createOrPendConnection failed:', result.message);
      return res.status(result.status || 500).json({ message: result.message });
    }
    
    // VERIFY: Check if connection was actually created
    const verifyConnection = await Connection.findById(result.connectionId).lean();
    console.log('🔍 VERIFY - Connection created:', {
      found: !!verifyConnection,
      connectionId: result.connectionId,
      doctorId: verifyConnection ? String(verifyConnection.doctorId || verifyConnection.doctor) : 'N/A',
      userId: verifyConnection ? String(verifyConnection.userId || verifyConnection.user) : 'N/A',
      status: verifyConnection?.status,
      matchesDoctor: verifyConnection ? (
        String(verifyConnection.doctorId || verifyConnection.doctor) === actualDoctorId ||
        String(verifyConnection.doctorId || verifyConnection.doctor) === String(doctorExactId)
      ) : false,
    });

    // CRITICAL: Verify notification was created and can be queried by doctor
    console.log('🔍 Verifying notification creation:', {
      notificationCreated: result.notificationCreated,
      doctorId: actualDoctorId,
      connectionId: result.connectionId,
      sessionId: result.sessionId,
    });
    
    if (result.notificationCreated !== false) {
      try {
        const Notification = require('../models/Notification');
        const doctorObjId = oid(actualDoctorId);
        
        // Wait a moment for database to commit
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try multiple query formats to find the notification
        const recentNotif = await Notification.findOne({
          $or: [
            { recipientId: doctorObjId },
            { recipientId: actualDoctorId },
            { recipientIdStr: actualDoctorId },
            { recipientIdStr: String(doctorObjId) },
          ],
          type: 'connect_request',
        }).sort({ createdAt: -1 }).lean();
        
        console.log('🔍 Post-request verification - Latest notification for doctor:', {
          doctorId: actualDoctorId,
          doctorIdObj: String(doctorObjId),
          notificationId: recentNotif ? String(recentNotif._id) : 'NOT FOUND',
          recipientId: recentNotif ? String(recentNotif.recipientId) : 'N/A',
          recipientIdStr: recentNotif?.recipientIdStr || 'N/A',
          createdAt: recentNotif?.createdAt || 'N/A',
          notificationCreated: result.notificationCreated,
          matchesDoctorId: recentNotif ? (
            String(recentNotif.recipientId) === actualDoctorId ||
            String(recentNotif.recipientId) === String(doctorObjId) ||
            recentNotif.recipientIdStr === actualDoctorId
          ) : false,
        });
        
        // Also check total notifications for this doctor
        const totalNotifs = await Notification.countDocuments({
          $or: [
            { recipientId: doctorObjId },
            { recipientId: actualDoctorId },
            { recipientIdStr: actualDoctorId },
            { recipientIdStr: String(doctorObjId) },
          ],
        });
        console.log('🔍 Total notifications for doctor:', {
          doctorId: actualDoctorId,
          totalCount: totalNotifs,
        });
        
        // If notification not found, log a warning
        if (!recentNotif) {
          console.error('❌ CRITICAL: Notification was created but cannot be found by doctor ID!', {
            doctorId: actualDoctorId,
            doctorIdObj: String(doctorObjId),
            notificationCreated: result.notificationCreated,
          });
        }
      } catch (e) {
        console.error('⚠️ Notification verification failed:', e.message, e.stack);
      }
    } else {
      console.warn('⚠️ Notification was NOT created (notificationCreated = false)');
      console.warn('⚠️ This means the doctor will NOT see the request in notifications!');
    }

    // Emit real-time notification to doctor via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${actualDoctorId}`).emit('connect_request', {
          connectionId: result.connectionId,
          sessionId: result.sessionId,
          userId: String(userId),
          hasIntake: !!intake,
        });
        console.log(`📡 Emitted connect_request to doctor:${actualDoctorId}`, {
          connectionId: result.connectionId,
          sessionId: result.sessionId,
        });
      } else {
        console.log('⚠️ Socket.IO instance not available');
      }
    } catch (e) {
      console.error('⚠️ Socket.IO emission failed:', e.message, e.stack);
    }

    console.log('✅ Therapy request processed successfully:', {
      connectionId: result.connectionId,
      sessionId: result.sessionId,
      message: result.message,
      notificationCreated: result.notificationCreated !== false,
      doctorId: actualDoctorId,
    });

    return res.json({
      message: result.message,
      connectionId: result.connectionId,
      sessionId: result.sessionId || null,
    });
  } catch (e) {
    console.error('❌ POST /doctors/request error:', e.message, e.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   DOCTOR: Pending requests (alerts)
   GET /api/doctors/alerts → { items: [...] }
---------------------------------------------- */
router.get('/alerts', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const doctorIdStr = String(doctorId);
    const doctorIdObj = oid(doctorId);
    
    console.log('📋 Doctor alerts requested:', {
      doctorId: doctorIdStr,
      doctorIdObj: String(doctorIdObj),
      role: req.user.role,
    });
    
    // Build match query - try multiple ID formats
    const match = { 
      status: 'pending', 
      ...doctorMatch(doctorId) 
    };
    
    // Also try direct queries to debug
    console.log('📋 Connection match query:', {
      doctorId: doctorIdStr,
      doctorIdObj: String(doctorIdObj),
      matchQuery: JSON.stringify(match, null, 2),
    });

    // DEBUG: Check ALL pending connections to see what doctorIds exist
    const allPending = await Connection.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20).lean();
    console.log('🔍 DEBUG - All pending connections in DB:', {
      total: allPending.length,
      connections: allPending.map(c => ({
        id: String(c._id),
        doctorId: c.doctorId ? String(c.doctorId) : 'missing',
        doctor: c.doctor ? String(c.doctor) : 'missing',
        userId: c.userId ? String(c.userId) : 'missing',
        user: c.user ? String(c.user) : 'missing',
        status: c.status,
        matchesDoctor: (
          (c.doctorId && (String(c.doctorId) === doctorIdStr || String(c.doctorId) === String(doctorIdObj))) ||
          (c.doctor && (String(c.doctor) === doctorIdStr || String(c.doctor) === String(doctorIdObj)))
        ),
      })),
    });

    // Try the match query first
    let pending = await Connection.find(match).sort({ createdAt: -1 }).lean();
    
    // If no results, try alternative queries as fallback
    if (pending.length === 0) {
      console.log('⚠️ No results with match query, trying alternative queries...');
      const alt1 = await Connection.find({ status: 'pending', doctorId: doctorIdObj }).sort({ createdAt: -1 }).lean();
      const alt2 = await Connection.find({ status: 'pending', doctor: doctorIdObj }).sort({ createdAt: -1 }).lean();
      const alt3 = await Connection.find({ status: 'pending', doctorId: doctorIdStr }).sort({ createdAt: -1 }).lean();
      const alt4 = await Connection.find({ status: 'pending', doctor: doctorIdStr }).sort({ createdAt: -1 }).lean();
      
      // Use the first non-empty result
      pending = alt1.length > 0 ? alt1 : 
                alt2.length > 0 ? alt2 : 
                alt3.length > 0 ? alt3 : 
                alt4.length > 0 ? alt4 : [];
      
      if (pending.length > 0) {
        console.log('✅ Found connections with alternative query:', {
          usedQuery: alt1.length > 0 ? 'doctorId: ObjectId' :
                     alt2.length > 0 ? 'doctor: ObjectId' :
                     alt3.length > 0 ? 'doctorId: String' :
                     'doctor: String',
          count: pending.length,
        });
      }
    }
    
    console.log('📋 Found pending connections:', {
      count: pending.length,
      connectionIds: pending.map(p => String(p._id)),
      connections: pending.map(p => ({
        id: String(p._id),
        doctorId: p.doctorId ? String(p.doctorId) : 'missing',
        doctor: p.doctor ? String(p.doctor) : 'missing',
        userId: p.userId ? String(p.userId) : 'missing',
        user: p.user ? String(p.user) : 'missing',
      })),
    });
    
    if (!pending.length) {
      console.log('📋 No pending connections found for doctor:', doctorIdStr);
      console.log('🔍 DEBUG - Checking if doctor exists and is approved...');
      const doctorCheck = await User.findOne({ _id: doctorIdObj, role: 'doctor' }).select('_id role isApproved').lean();
      console.log('🔍 Doctor check result:', {
        found: !!doctorCheck,
        doctorId: doctorIdStr,
        role: doctorCheck?.role,
        isApproved: doctorCheck?.isApproved,
      });
      
      // CRITICAL DEBUG: Try to find connections with a simpler query
      console.log('🔍 DEBUG - Trying simpler connection queries...');
      const test1 = await Connection.find({ status: 'pending', doctorId: doctorIdObj }).lean();
      const test2 = await Connection.find({ status: 'pending', doctor: doctorIdObj }).lean();
      const test3 = await Connection.find({ status: 'pending', doctorId: doctorIdStr }).lean();
      const test4 = await Connection.find({ status: 'pending', doctor: doctorIdStr }).lean();
      
      console.log('🔍 DEBUG - Simple query results:', {
        'doctorId: ObjectId': test1.length,
        'doctor: ObjectId': test2.length,
        'doctorId: String': test3.length,
        'doctor: String': test4.length,
        allResults: [
          ...test1.map(c => ({ id: String(c._id), field: 'doctorId', value: String(c.doctorId), type: typeof c.doctorId })),
          ...test2.map(c => ({ id: String(c._id), field: 'doctor', value: String(c.doctor), type: typeof c.doctor })),
          ...test3.map(c => ({ id: String(c._id), field: 'doctorId', value: String(c.doctorId), type: typeof c.doctorId })),
          ...test4.map(c => ({ id: String(c._id), field: 'doctor', value: String(c.doctor), type: typeof c.doctor })),
        ],
      });
      
      return res.json({ items: [] });
    }

    const userIds = pending.map(p => p.userId || p.user).filter(Boolean).map(String);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('_id name email profilePhoto gender age').lean()
      : [];

    // Latest photo per user (works for Photo.userId or Photo.user)
    const ids = userIds.map(oid);
    const latestByUser = new Map();
    try {
      const photos1 = await Photo.aggregate([
        { $match: { userId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      ]);
      photos1.forEach(p => latestByUser.set(String(p._id), p.doc));
    } catch (e) {
      // Ignore photo aggregation errors
    }

    try {
      const photos2 = await Photo.aggregate([
        { $match: { user: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$user', doc: { $first: '$$ROOT' } } },
      ]);
      photos2.forEach(p => {
        const k = String(p._id);
        if (!latestByUser.has(k)) {
          latestByUser.set(k, p.doc);
        }
      });
    } catch (e) {
      // Ignore photo aggregation errors
    }

    // Fetch session details (id + intake) per pair
    // CRITICAL: Fix the query to properly match sessions with userId/doctorId pairs
    const sessionDetails = new Map();
    try {
      // Build proper $or query with multiple conditions
      const sessionQueries = [];
      for (const p of pending) {
        const uid = p.userId || p.user;
        const did = p.doctorId || p.doctor;
        if (uid && did) {
          // Try multiple ID formats to match
          const uidObj = oid(String(uid));
          const didObj = oid(String(did));
          const uidStr = String(uid);
          const didStr = String(did);
          
          sessionQueries.push(
            { userId: uidObj, doctorId: didObj },
            { userId: uidObj, doctorId: didStr },
            { userId: uidStr, doctorId: didObj },
            { userId: uidStr, doctorId: didStr },
          );
        }
      }
      
      console.log('🔍 Fetching sessions for alerts:', {
        pendingCount: pending.length,
        queryCount: sessionQueries.length,
        sampleQueries: sessionQueries.slice(0, 2),
      });
      
      const sessions = sessionQueries.length > 0
        ? await Session.find({ 
            $or: sessionQueries,
            status: 'pending', // Only get pending sessions
          })
          .select('_id userId doctorId intake status')
          .lean()
        : [];
      
      console.log('🔍 Found sessions:', {
        count: sessions.length,
        sessions: sessions.map(s => ({
          id: String(s._id),
          userId: String(s.userId),
          doctorId: String(s.doctorId),
          hasIntake: !!s.intake,
          intakeFields: s.intake ? Object.keys(s.intake) : [],
        })),
      });
      
      sessions.forEach(s => {
        // Create keys with both ObjectId and string formats
        const uid = String(s.userId);
        const did = String(s.doctorId);
        const key1 = `${uid}_${did}`;
        const key2 = `${String(oid(uid))}_${String(oid(did))}`;
        
        const sessionData = {
          id: String(s._id),
          intake: s.intake || null,
          status: s.status,
        };
        
        sessionDetails.set(key1, sessionData);
        sessionDetails.set(key2, sessionData);
      });
      
      console.log('🔍 Session details map:', {
        mapSize: sessionDetails.size,
        keys: Array.from(sessionDetails.keys()).slice(0, 5),
      });
    } catch (e) {
      console.error('❌ alerts: fetch sessionDetails failed:', e.message, e.stack);
    }

    const items = pending.map(p => {
      const uid = String(p.userId || p.user || '');
      const did = String(p.doctorId || p.doctor || '');
      const u = users.find(x => String(x._id) === uid);
      const ph = latestByUser.get(uid);
      
      // Try multiple key formats to find session
      const key1 = `${uid}_${did}`;
      const key2 = `${String(oid(uid))}_${String(oid(did))}`;
      const s = sessionDetails.get(key1) || sessionDetails.get(key2) || null;
      
      console.log('🔍 Mapping alert item:', {
        connectionId: String(p._id),
        userId: uid,
        doctorId: did,
        sessionFound: !!s,
        sessionId: s?.id || 'N/A',
        hasIntake: !!s?.intake,
        intakeFields: s?.intake ? Object.keys(s.intake) : [],
      });
      
      return {
        id: String(p._id),
        sessionId: s?.id || null,
        intake: s?.intake || null,
        user: u
          ? {
              id: String(u._id),
              name: u.name,
              email: u.email,
              gender: u.gender,
              age: u.age,
            }
          : null,
        requestedAt: p.requestedAt || p.createdAt,
        photo: ph
          ? {
              raw: ph.filepath,
              annotated: ph.annotated || null,
            }
          : null,
      };
    });

    console.log('📋 Returning alerts:', {
      doctorId: doctorIdStr,
      itemCount: items.length,
      itemsWithIntake: items.filter(i => i.intake).length,
    });

    res.json({ items });
  } catch (e) {
    console.error('GET /doctors/alerts error', e);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ---------------------------------------------
   DOCTOR: Accept / Reject a request
   POST /api/doctors/alerts/respond { connectionId, action }
---------------------------------------------- */
router.post('/alerts/respond', verifyToken, requireDoctor, async (req, res) => {
  try {
    const { connectionId, action } = req.body;
    if (!connectionId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      ...doctorMatch(req.user.userId),
    });
    if (!conn) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const rawUserId = conn.userId || conn.user;
    const rawDoctorId = conn.doctorId || conn.doctor;
    const userStr = String(rawUserId);
    const doctorStr = String(rawDoctorId);
    const userId = typeof rawUserId === 'string' ? oid(rawUserId) : rawUserId;
    const doctorId = typeof rawDoctorId === 'string' ? oid(rawDoctorId) : rawDoctorId;

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      // Accept/create a session
      let sessionId = null;
      try {
        let session = await Session.findOne({
          userId,
          doctorId,
          status: 'pending',
        }).sort({ createdAt: -1 });

        if (!session) {
          session = new Session({
            userId,
            doctorId,
            status: 'accepted',
            marmaPlan: [
              { name: 'Marma 1', durationSec: 60, notes: '' },
              { name: 'Marma 2', durationSec: 60, notes: '' },
              { name: 'Marma 3', durationSec: 60, notes: '' },
              { name: 'Marma 4', durationSec: 60, notes: '' },
            ],
          });
          await attachLatestFootPhoto(session);
        } else {
          session.status = 'accepted';
        }
        await session.save();
        sessionId = String(session._id);
        console.log('✅ Accepted session:', sessionId);
      } catch (e) {
        console.error('⚠️ Session accept failed:', e.message);
      }

      // Ensure room exists
      try {
        if (Room) {
          let room = await Room.findOne({
            participants: { $all: [userId, doctorId] },
          });
          if (!room) {
            room = await Room.create({ participants: [userId, doctorId] });
          }
        }
      } catch (e) {
        console.log('room ensure warn:', e.message);
      }

      try {
        await Notification.create({
          recipientId: userId,
          recipientIdStr: userStr,
          actorId: doctorId,
          type: 'connect_accepted',
          message: 'Your doctor accepted the therapy request',
          meta: {
            doctorId: doctorStr,
            sessionId: sessionId || null,
          },
        });
      } catch (e) {
        // Ignore notification errors
      }

      return res.json({ message: 'Accepted', sessionId: sessionId || null });
    }

    // Reject
    conn.status = 'rejected';
    await conn.save();

    try {
      await Notification.create({
        recipientId: userId,
        recipientIdStr: userStr,
        actorId: doctorId,
        type: 'connect_rejected',
        message: 'Your connection request was rejected',
        meta: { doctorId: doctorStr },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({ message: 'Rejected' });
  } catch (e) {
    console.error('POST /doctors/alerts/respond error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR DASHBOARD: Patients list
   GET /api/doctors/patients → { patients: [...] }
   Returns connected patients with their details, intake info, and therapy sessions
---------------------------------------------- */
router.get('/patients', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    const doctorIdStr = String(doctorId);
    const doctorIdObj = oid(doctorId);
    
    // Get all connections (accepted, pending, etc.)
    const match = { ...doctorMatch(doctorId) };
    const conns = await Connection.find(match).sort({ createdAt: -1 }).lean();

    const userIds = conns.map(c => c.userId || c.user).filter(Boolean).map(String);
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } })
          .select('_id name email profilePhoto gender age phone address')
          .lean()
      : [];

    // Also fetch Profile data for avatars
    const Profile = require('../models/Profile');
    const profiles = userIds.length
      ? await Profile.find({ userId: { $in: userIds.map(oid) } }).lean()
      : [];
    const profilesByUserId = new Map();
    profiles.forEach(p => {
      profilesByUserId.set(String(p.userId), p);
    });

    // Get latest sessions with intake data for each patient
    const sessionsByUser = new Map();
    if (userIds.length) {
      const userIdsObj = userIds.map(oid);
      const sessions = await Session.find({
        doctorId: doctorIdObj,
        userId: { $in: userIdsObj },
      })
        .sort({ createdAt: -1 })
        .lean();
      
      // Group sessions by userId, keeping the latest one with intake
      sessions.forEach(s => {
        const uid = String(s.userId);
        if (!sessionsByUser.has(uid)) {
          sessionsByUser.set(uid, []);
        }
        sessionsByUser.get(uid).push({
          id: String(s._id),
          status: s.status,
          intake: s.intake || null,
          instructions: s.instructions || null,
          marmaPlan: s.marmaPlan || [],
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
      });
    }

    // Get latest photos
    const latestByUser = new Map();
    if (userIds.length) {
      const ids = userIds.map(oid);
      try {
        const A = await Photo.aggregate([
          { $match: { userId: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$userId',
              lastPhotoAt: { $first: '$createdAt' },
              latestFile: { $first: '$filepath' },
              latestAnnotated: { $first: '$annotated' },
            },
          },
        ]);
        A.forEach(r => latestByUser.set(String(r._id), r));
      } catch (e) {
        // Ignore aggregation errors
      }

      try {
        const B = await Photo.aggregate([
          { $match: { user: { $in: ids } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: '$user',
              lastPhotoAt: { $first: '$createdAt' },
              latestFile: { $first: '$filepath' },
              latestAnnotated: { $first: '$annotated' },
            },
          },
        ]);
        B.forEach(r => {
          const k = String(r._id);
          if (!latestByUser.has(k)) {
            latestByUser.set(k, r);
          }
        });
      } catch (e) {
        // Ignore aggregation errors
      }
    }

    const patients = conns.map(c => {
      const uid = String(c.userId || c.user || '');
      const u = users.find(x => String(x._id) === uid);
      const profile = profilesByUserId.get(uid);
      const sessions = sessionsByUser.get(uid) || [];
      const latestSession = sessions[0] || null; // Most recent session
      
      const photoData = latestByUser.get(uid);
      
      // Use Profile.avatar if available, otherwise User.profilePhoto
      const avatarUrl = profile?.avatar || u?.profilePhoto || null;
      
      return {
        _id: String(c._id),
        connectionId: String(c._id),
        status: c.status === 'accepted' ? 'approved' : c.status,
        requestedAt: c.requestedAt || c.createdAt,
        user: u
          ? {
              _id: String(u._id),
              id: String(u._id),
              name: u.name,
              email: u.email,
              avatarUrl: avatarUrl,
              profilePhoto: avatarUrl, // Also include for compatibility
              gender: u.gender || profile?.gender || null,
              age: u.age || null,
              phone: u.phone || profile?.phone || null,
              address: u.address || null,
            }
          : null,
        lastPhotoAt: photoData?.lastPhotoAt || null,
        latestPhotoThumb: photoData?.latestAnnotated || photoData?.latestFile || null,
        // Latest intake/pain information from most recent session
        latestIntake: latestSession?.intake || null,
        // All therapy sessions for this patient
        therapySessions: sessions.map(s => ({
          id: s.id,
          status: s.status,
          hasInstructions: !!(s.instructions?.text || s.marmaPlan?.length),
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        // Latest session ID for quick access
        latestSessionId: latestSession?.id || null,
      };
    });

    res.json({ patients });
  } catch (e) {
    console.error('GET /api/doctors/patients error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR updates connection status (approved/rejected)
   PATCH /api/doctors/connections/:id { status }
---------------------------------------------- */
router.patch('/connections/:id', verifyToken, requireDoctor, async (req, res) => {
  try {
    const { id } = req.params;
    const inStatus = String(req.body.status || '').toLowerCase();
    const mapIn = {
      approved: 'accepted',
      accept: 'accepted',
      accepted: 'accepted',
      pending: 'pending',
      reject: 'rejected',
      rejected: 'rejected',
    };
    const dbStatus = mapIn[inStatus];
    if (!dbStatus) {
      return res.status(400).json({ message: 'invalid_status' });
    }

    const conn = await Connection.findOneAndUpdate(
      { _id: id, ...doctorMatch(req.user.userId) },
      { $set: { status: dbStatus } },
      { new: true }
    ).lean();

    if (!conn) {
      return res.status(404).json({ message: 'connection_not_found' });
    }

    const outMap = { accepted: 'approved', pending: 'pending', rejected: 'rejected' };
    res.json({ ok: true, status: outMap[conn.status] || conn.status });
  } catch (e) {
    console.error('PATCH /api/doctors/connections/:id error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: which doctors have accepted me?
   GET /api/doctors/my/accepted
---------------------------------------------- */
router.get('/my/accepted', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);

    const accepted = await Connection.find({
      status: { $in: ['accepted', 'approved'] },
      $or: [{ userId: me }, { user: me }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const docIds = accepted.map(c => String(c.doctorId || c.doctor)).filter(Boolean);
    if (!docIds.length) {
      return res.json({ items: [] });
    }

    const docs = await User.find({ _id: { $in: docIds } })
      .select('_id name email profilePhoto gender age specialization qualifications bio documentPath')
      .lean();

    // Also fetch Profile data for fullName and avatar
    const Profile = require('../models/Profile');
    const profiles = await Profile.find({ userId: { $in: docIds.map(oid) } }).lean();
    const profilesByUserId = new Map();
    profiles.forEach(p => {
      profilesByUserId.set(String(p.userId), p);
    });

    const byId = new Map(docs.map(d => [String(d._id), d]));
    const items = docIds
      .map(id => {
        const d = byId.get(String(id));
        if (!d) return null;
        const profile = profilesByUserId.get(String(id));
        const avatarUrl = profile?.avatar || d.profilePhoto || null;
        return {
          id: String(d._id),
          name: d.name,
          fullName: profile?.fullName || null, // Include fullName from Profile
          title: profile?.title || null, // Include title from Profile
          email: d.email,
          avatar: avatarUrl,
          profilePhoto: avatarUrl, // Also include for compatibility
          gender: d.gender || profile?.gender || null,
          age: d.age ?? null,
          specialization: d.specialization ?? null,
          qualifications: d.qualifications ?? null,
          bio: d.bio ?? null,
          documentPath: d.documentPath || null,
        };
      })
      .filter(Boolean);

    res.json({ items });
  } catch (e) {
    console.error('GET /api/doctors/my/accepted error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   DOCTOR -> USER: Send an invite to connect
   POST /api/doctors/invite { userId }
---------------------------------------------- */
router.post('/invite', verifyToken, requireDoctor, async (req, res) => {
  try {
    const doctorId = String(req.user.userId);
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId required' });
    }

    const result = await createOrPendConnection({ userId, doctorId });
    if (!result.ok) {
      return res.status(result.status || 500).json({ message: result.message });
    }

    try {
      const recipientObj = typeof userId === 'string' ? oid(userId) : userId;
      await Notification.create({
        recipientId: recipientObj,
        recipientIdStr: String(userId),
        actorId: typeof doctorId === 'string' ? oid(doctorId) : doctorId,
        type: 'connect_request_from_doctor',
        message: 'Your doctor invited you to connect',
        meta: {
          connectionId: result.connectionId,
          doctorId: doctorId,
        },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({
      message: 'Invite sent to user',
      connectionId: result.connectionId,
    });
  } catch (e) {
    console.error('POST /doctors/invite error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: See doctor invites to me (pending)
   GET /api/doctors/invites → { items: [...] }
---------------------------------------------- */
router.get('/invites', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);

    const pending = await Connection.find({
      status: 'pending',
      $or: [{ userId: me }, { user: me }],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!pending.length) {
      return res.json({ items: [] });
    }

    const doctorIds = pending.map(p => String(p.doctorId || p.doctor)).filter(Boolean);
    const docs = await User.find({ _id: { $in: doctorIds } })
      .select('_id name email profilePhoto gender age specialization')
      .lean();
    const byId = new Map(docs.map(d => [String(d._id), d]));

    const items = pending.map(p => {
      const did = String(p.doctorId || p.doctor || '');
      const d = byId.get(did);
      return {
        id: String(p._id),
        doctor: d
          ? {
              id: String(d._id),
              name: d.name,
              email: d.email,
              avatar: d.profilePhoto || null,
              gender: d.gender || null,
              age: d.age || null,
              specialization: d.specialization || null,
            }
          : null,
        requestedAt: p.requestedAt || p.createdAt,
      };
    });

    res.json({ items });
  } catch (e) {
    console.error('GET /doctors/invites error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

/* ---------------------------------------------
   USER: Accept/Reject a doctor invite
   POST /api/doctors/invites/respond { connectionId, action }
---------------------------------------------- */
router.post('/invites/respond', verifyToken, requireUser, async (req, res) => {
  try {
    const me = String(req.user.userId);
    const { connectionId, action } = req.body || {};
    if (!connectionId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'connectionId and valid action required' });
    }

    const conn = await Connection.findOne({
      _id: connectionId,
      $or: [{ userId: me }, { user: me }],
    });
    if (!conn) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const rawDoctorId = conn.doctorId || conn.doctor;
    const rawUserId = conn.userId || conn.user;
    const doctorObj = typeof rawDoctorId === 'string' ? oid(rawDoctorId) : rawDoctorId;
    const userObj = typeof rawUserId === 'string' ? oid(rawUserId) : rawUserId;
    const doctorStr = String(rawDoctorId);
    const userStr = String(rawUserId);

    if (action === 'accept') {
      conn.status = 'accepted';
      await conn.save();

      try {
        await Notification.create({
          recipientId: doctorObj,
          recipientIdStr: doctorStr,
          actorId: userObj,
          type: 'connect_accepted_by_user',
          message: 'The patient accepted your connection request',
          meta: { userId: userStr },
        });
      } catch (e) {
        // Ignore notification errors
      }

      return res.json({ message: 'Accepted' });
    }

    // Reject
    conn.status = 'rejected';
    await conn.save();

    try {
      await Notification.create({
        recipientId: doctorObj,
        recipientIdStr: doctorStr,
        actorId: userObj,
        type: 'connect_rejected_by_user',
        message: 'The patient rejected your connection request',
        meta: { userId: userStr },
      });
    } catch (e) {
      // Ignore notification errors
    }

    return res.json({ message: 'Rejected' });
  } catch (e) {
    console.error('POST /doctors/invites/respond error', e);
    res.status(500).json({ message: 'server_error' });
  }
});

// Debug endpoints removed for production

module.exports = router;
