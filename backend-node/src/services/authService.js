const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/db");
const config = require("../config/env");
const { serializeUser } = require("../utils/serializer");
const { createAccessToken, createRefreshToken, setRefreshCookie, clearRefreshCookie } = require("../utils/token");

class AuthService {
  async register({ name, email, password, phone }) {
    const emailClean = (email || "").trim().toLowerCase();
    if (!emailClean || !password) {
      const err = new Error("Email and password are required.");
      err.statusCode = 400;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = await prisma.user.findUnique({
      where: { email: emailClean },
    });

    if (user) {
      // If user already exists, update password & credentials (matching FastAPI behavior)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          phone: phone !== undefined ? (phone || "") : user.phone,
          password: hashedPassword,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: name || emailClean.split("@")[0],
          email: emailClean,
          password: hashedPassword,
          phone: phone || "",
          role: "customer",
          profile: {
            create: {
              monthlyBudget: 500,
              minimumData: 10,
              minimumCallMinutes: 500,
              minimumSms: 100,
              preferredDuration: "28",
              requires5G: false,
              preferredOperator: "",
            },
          },
        },
      });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    return {
      user: serializeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async login({ email, password }) {
    const emailClean = (email || "").trim().toLowerCase();
    if (!emailClean || !password) {
      const err = new Error("Invalid email or password.");
      err.statusCode = 401;
      throw err;
    }

    let user = await prisma.user.findUnique({
      where: { email: emailClean },
    });

    if (!user) {
      if (emailClean.includes("@") && password.length >= 6) {
        const derivedName = emailClean.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await prisma.user.create({
          data: {
            name: derivedName || "Customer",
            email: emailClean,
            password: hashedPassword,
            phone: "",
            role: "customer",
            profile: {
              create: {
                monthlyBudget: 500,
                minimumData: 10,
                minimumCallMinutes: 500,
                minimumSms: 100,
                preferredDuration: "28",
                requires5G: false,
                preferredOperator: "",
              },
            },
          },
        });
      } else {
        const err = new Error("Invalid email or password.");
        err.statusCode = 401;
        throw err;
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const err = new Error("Invalid email or password.");
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error("This account has been deactivated. Contact support.");
      err.statusCode = 403;
      throw err;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    return {
      user: serializeUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      const err = new Error("No refresh token found. Please log in again.");
      err.statusCode = 401;
      throw err;
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      const err = new Error("Invalid or expired refresh token. Please log in again.");
      err.statusCode = 401;
      throw err;
    }

    const userId = payload.id ? parseInt(payload.id, 10) : null;
    let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

    if (!user && payload.email) {
      user = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    }

    if (!user || !user.isActive) {
      const err = new Error("User no longer exists or is deactivated.");
      err.statusCode = 401;
      throw err;
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: serializeUser(user),
    };
  }
}

module.exports = new AuthService();
