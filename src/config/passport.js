const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const { signToken } = require('../utils/jwt.util');
const { SERVER_URL } = require('./config');

// Google OAuth Strategy (only initialize if env is set)
const hasGoogleOAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (hasGoogleOAuth) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${SERVER_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Tìm user theo Google ID hoặc email
      let user = await User.findOne({ 
        where: { 
          google_id: profile.id 
        } 
      });

      if (!user) {
        // Tìm theo email nếu chưa có Google ID
        user = await User.findOne({ 
          where: { 
            email: profile.emails[0].value 
          } 
        });

        if (user) {
          // Cập nhật Google ID cho user hiện tại
          user.google_id = profile.id;
          await user.save();
        } else {
          // Tạo user mới
          user = await User.create({
            google_id: profile.id,
            full_name: profile.displayName,
            email: profile.emails[0].value,
            password_hashed: null, // Google user không cần password
            is_verified: true, // Google đã verify email
            role: 'customer'
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.warn('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
