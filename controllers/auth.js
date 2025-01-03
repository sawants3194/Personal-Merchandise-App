const User = require("../models/user");
// const {authenticate} = require('../models/user')
const { validationResult } = require("express-validator");
var jwt = require("jsonwebtoken");
var expressJwt = require("express-jwt");
var jwt_deocde = require("jwt-decode");
const sgMail = require('@sendgrid/mail');
const config = require("../config");
sgMail.setApiKey(config.email.sendgridApiKey);

exports.signup = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.json({ Error: errors.array()[0].msg });
  }


  var email = req.body.email;

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      const user = new User(req.body);
      user.save((err, user) => {
        if (err) {
          return res.status(400).json({
            Message: err.message,
          });
        }
        res.json(user);
      });
    }
    else {
      return res.status(400).json({
        Message: "Email exists",
      });
    }
  })

  // res.send('signup works')
};

exports.signout = (req, res) => {
  res.clearCookie("token");
  res.json({
    message: "User signout successful",
  });
};

exports.signin = (req, res) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).send(errors.array());
  }
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.json({
        error: "User does not exists",
      });
    }

    if (!user.authenticate(password)) {
      return res.json({
        error: "password does not match.",
      });
    }

    // creating a token
    var token = jwt.sign({ _id: user._id }, config.app.secret);

    //put token in cookie
    res.cookie("token", token, { expire: new Date() + 9999 });

    // send response to front end
    const { _id, name, email, role } = user;
    return res.json({
      token,
      user: user,
    });
  });
};

//protected route
exports.isSignIn = expressJwt({
  secret: config.app.secret,
  userProperty: "auth",
});

// custom middlewares
// is Authenticated remaining sec-7 v-7

exports.getUserID = (req, res) => {
  console.log(req)
  jwt_token = req.headers.authorization.split(' ')[1]
  console.log(jwt_token)

  jwt_token = jwt_deocde(jwt_token)
  return jwt_token._id
}

exports.isAuthenticated = async(req, res, next) => {
  try {
    // Check if the authorization header exists
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    // Extract the token
    const token = req.headers.authorization.split(' ')[1];

    // Decode the token
    const decoded = jwt.decode(token); // Or verify if needed (jwt.verify)

    

    // Check if the user exists in the database
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({ error: 'User not found. Please sign in.' });
    }

    // Attach user data to the request object for future use
    req.user = user;

    // Call the next middleware
    next();
  } catch (err) {
    // Catch any other errors
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

exports.isAdmin = (req, res, next) => {
  let jwt_token = req.headers.authorization.split(' ')[1]
  // console.log(jwt_token);
  jwt_token = jwt_deocde(jwt_token)
  User.findById(jwt_token, (err, data) => {
    if (err || data.role !== 1) {
      return res.json({
        error: data
      })
    }
    next()
  })
};

exports.requestPasswordRecovery = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({
        message: `The email address ${req.body.email} is not associated with any account. Double-check your email address and try again.`,
      });
    }

    //Generate and set password reset token
    user.generatePasswordReset();
    // Save the updated user object

    await user.save(); 

    // Construct reset link
    const protocol = req.protocol; // 'http' or 'https'
    const resetLink = `${protocol}://localhost:3000/user/newPassword?token=${user.resetPasswordToken}`;
    
    const mailOptions = {
      to: user.email,
      from: config.email.from,
      subject: "Password change request",
      text: `Hi ${user.name} \n 
            Please click on the following link ${resetLink} to reset your password. \n\n 
            If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    } 

    await sgMail.send(mailOptions);
    return res.status(200).json({
      message: `A reset email has been sent to ${user.email}.`,
      resetLink: resetLink,
      resetPasswordToken:user.resetPasswordToken,
      recoveruser: { id: user._id, email: user.email }, // Avoid exposing sensitive data
    });
  } catch (error) {
    console.error("Password recovery error:", error);
    return res.status(500).json({ 
      message: "An error occurred. Please try again later." 
    });
  }

};

exports.validateResetToken = (req, res, next) => {

  User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: new Date().getTime() }
  })
    .then((user) => {
      if (!user) return res.status(401).json({
        message: 'Password reset token is invalid or has expired. Please request a new one.'
      });
      //Redirect user to form with the email address
      next()
    })
    .catch(err => {
      console.error("Error during password reset token validation:", err);
      res.status(500).json({ message: "An error occurred while validating the reset token. Please try again later." });
    });

};

exports.updatePassword = (req, res) => {
  User.findOne({ 
    resetPasswordToken: req.params.token, 
    resetPasswordExpires: { $gt: Date.now() } 
  })
    .then((user) => {
      if (!user) return res.status(401).json({ 
        message: 'Password reset token is invalid or has expired.' 
      });

      //Set the new password
      user.password = req.body.password;



      // Save
      user.save((err) => {
        if (err) return res.status(500).json({ 
          message: err.message 
        });

  
        return res.status(200).json({ 
          message: 'Your password has been updated.', 
          ResetPasswordUser: user 
        });
        // });


      });
    });
};