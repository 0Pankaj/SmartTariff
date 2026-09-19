const { prisma } = require("../config/db");
const { serializeCustomerProfile } = require("../utils/serializer");

class CustomerService {
  async getProfile(userId) {
    let profile = await prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await prisma.customerProfile.create({
        data: {
          userId,
          monthlyBudget: 500,
          minimumData: 10,
          minimumCallMinutes: 500,
          minimumSms: 100,
          preferredDuration: "28",
          requires5G: false,
          preferredOperator: "",
        },
      });
    }

    return serializeCustomerProfile(profile);
  }

  async updateProfile(userId, body) {
    const updateData = {};
    if (body.monthlyBudget !== undefined) updateData.monthlyBudget = body.monthlyBudget !== null ? Number(body.monthlyBudget) : null;
    if (body.minimumData !== undefined) updateData.minimumData = body.minimumData !== null ? Number(body.minimumData) : null;
    if (body.minimumCallMinutes !== undefined) updateData.minimumCallMinutes = body.minimumCallMinutes !== null ? Number(body.minimumCallMinutes) : null;
    if (body.minimumSms !== undefined) updateData.minimumSms = body.minimumSms !== null ? Number(body.minimumSms) : null;
    if (body.preferredDuration !== undefined) updateData.preferredDuration = body.preferredDuration || "28";
    if (body.requires5G !== undefined) updateData.requires5G = Boolean(body.requires5G);
    if (body.preferredOperator !== undefined) updateData.preferredOperator = body.preferredOperator || "";
    if (body.currentPlan !== undefined) {
      updateData.currentPlanId = body.currentPlan ? parseInt(body.currentPlan, 10) : null;
    } else if (body.currentPlanId !== undefined) {
      updateData.currentPlanId = body.currentPlanId ? parseInt(body.currentPlanId, 10) : null;
    }

    const profile = await prisma.customerProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
      },
    });

    return serializeCustomerProfile(profile);
  }
}

module.exports = new CustomerService();
