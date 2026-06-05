import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/modules/user/user.model.js';
import ActiveSession from '../../src/models/ActiveSession.model.js';
import { hashPassword } from '../../src/utils/hashPassword.js';
import { ROLES } from '../../src/constants/roles.js';
import { USER_STATUS } from '../../src/constants/userStatus.js';
import { clearDatabase } from '../helpers/testUtils.js';

const API_PREFIX = '/api/v1';

const createAgent = () => request.agent(app);

const login = async ({ agent, mobile, password, userAgent = 'Chrome Desktop' }) => {
  return agent
    .post(`${API_PREFIX}/auth/login`)
    .set('user-agent', userAgent)
    .send({ mobile, password });
};

describe('single active session', () => {
  let vendorPassword;
  let deliveryPassword;
  let adminPassword;
  let vendorUser;
  let deliveryPartnerUser;

  beforeEach(async () => {
    await clearDatabase();
    jest.restoreAllMocks();

    vendorPassword = 'VendorPass123!';
    deliveryPassword = 'DeliveryPass123!';
    adminPassword = 'AdminPass123!';

    const hashedVendorPassword = await hashPassword(vendorPassword);
    const hashedDeliveryPassword = await hashPassword(deliveryPassword);
    const hashedAdminPassword = await hashPassword(adminPassword);

    vendorUser = await User.create({
      name: 'Vendor User',
      email: 'vendor@test.com',
      mobile: '9876543210',
      password: hashedVendorPassword,
      role: ROLES.VENDOR,
      status: USER_STATUS.ACTIVE,
      isVerified: true,
    });

    deliveryPartnerUser = await User.create({
      name: 'Delivery User',
      email: 'delivery@test.com',
      mobile: '9876543211',
      password: hashedDeliveryPassword,
      role: ROLES.DELIVERY_PARTNER,
      status: USER_STATUS.ACTIVE,
      isVerified: true,
    });

    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      mobile: '9876543212',
      password: hashedAdminPassword,
      role: ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      isVerified: true,
    });

    const emit = jest.fn();
    global.io = {
      to: jest.fn(() => ({ emit })),
      emit,
    };
  });

  it('creates and stores a vendor session id on login', async () => {
    const response = await login({ agent: createAgent(), mobile: vendorUser.mobile, password: vendorPassword });

    expect(response.status).toBe(200);
    expect(response.body.data.sessionId).toBeDefined();
    expect(response.body.data.accessToken).toBeDefined();

    const session = await ActiveSession.findOne({ userId: vendorUser._id, isActive: true });
    expect(session).toBeTruthy();
    expect(session.sessionId).toBe(response.body.data.sessionId);
  });

  it('invalidates the prior vendor session and emits force_logout to the old socket', async () => {
    const chromeAgent = createAgent();
    const edgeAgent = createAgent();

    const firstLogin = await login({
      agent: chromeAgent,
      mobile: vendorUser.mobile,
      password: vendorPassword,
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    });

    await ActiveSession.updateOne(
      { sessionId: firstLogin.body.data.sessionId },
      { $set: { socketId: 'socket-old' } }
    );

    const secondLogin = await login({
      agent: edgeAgent,
      mobile: vendorUser.mobile,
      password: vendorPassword,
      userAgent: 'Mozilla/5.0 Edg/120.0.0.0',
    });

    expect(secondLogin.status).toBe(200);
    expect(secondLogin.body.data.previousSessionInvalidated).toBe(true);

    const oldSession = await ActiveSession.findOne({ sessionId: firstLogin.body.data.sessionId });
    const newSession = await ActiveSession.findOne({ sessionId: secondLogin.body.data.sessionId });

    expect(oldSession.isActive).toBe(false);
    expect(newSession.isActive).toBe(true);
    expect(global.io.to).toHaveBeenCalledWith('socket-old');
  });

  it('rejects API access and refresh-token rotation from an invalidated vendor session', async () => {
    const firstAgent = createAgent();
    const secondAgent = createAgent();

    const firstLogin = await login({ agent: firstAgent, mobile: vendorUser.mobile, password: vendorPassword });
    const secondLogin = await login({ agent: secondAgent, mobile: vendorUser.mobile, password: vendorPassword });

    expect(secondLogin.status).toBe(200);

    const profileResponse = await firstAgent
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${firstLogin.body.data.accessToken}`);

    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body.message.toLowerCase()).toContain('session');

    const refreshResponse = await firstAgent
      .post(`${API_PREFIX}/auth/refresh-token`)
      .send({ refreshToken: firstLogin.body.data.refreshToken });

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.message.toLowerCase()).toContain('session');
  });

  it('keeps the active vendor session valid across refresh-token rotation and browser refresh', async () => {
    const agent = createAgent();
    const loginResponse = await login({ agent, mobile: vendorUser.mobile, password: vendorPassword });

    const refreshResponse = await agent
      .post(`${API_PREFIX}/auth/refresh-token`)
      .send({ refreshToken: loginResponse.body.data.refreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.data.accessToken).toBeDefined();

    const profileResponse = await agent
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${refreshResponse.body.data.accessToken}`);

    expect(profileResponse.status).toBe(200);

    const activeSession = await ActiveSession.findOne({ sessionId: loginResponse.body.data.sessionId, isActive: true });
    expect(activeSession).toBeTruthy();
  });

  it('enforces a single active session for delivery partners', async () => {
    const firstAgent = createAgent();
    const secondAgent = createAgent();

    const firstLogin = await login({ agent: firstAgent, mobile: deliveryPartnerUser.mobile, password: deliveryPassword });
    const secondLogin = await login({ agent: secondAgent, mobile: deliveryPartnerUser.mobile, password: deliveryPassword });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(secondLogin.body.data.previousSessionInvalidated).toBe(true);

    const activeSessions = await ActiveSession.find({ userId: deliveryPartnerUser._id, isActive: true });
    expect(activeSessions).toHaveLength(1);
  });

  it('allows admin users to stay logged in across multiple browsers', async () => {
    const chromeAgent = createAgent();
    const firefoxAgent = createAgent();

    const firstLogin = await login({ agent: chromeAgent, mobile: '9876543212', password: adminPassword });
    const secondLogin = await login({ agent: firefoxAgent, mobile: '9876543212', password: adminPassword });

    expect(firstLogin.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(firstLogin.body.data.sessionId).toBeNull();
    expect(secondLogin.body.data.sessionId).toBeNull();

    const firstProfile = await chromeAgent
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${firstLogin.body.data.accessToken}`);

    const secondProfile = await firefoxAgent
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${secondLogin.body.data.accessToken}`);

    expect(firstProfile.status).toBe(200);
    expect(secondProfile.status).toBe(200);
  });

  it('invalidates the vendor session on manual logout', async () => {
    const agent = createAgent();
    const loginResponse = await login({ agent, mobile: vendorUser.mobile, password: vendorPassword });

    const logoutResponse = await agent
      .post(`${API_PREFIX}/auth/logout`)
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .set('x-csrf-token', loginResponse.body.data.csrfToken)
      .send({ refreshToken: loginResponse.body.data.refreshToken });

    expect(logoutResponse.status).toBe(200);

    const session = await ActiveSession.findOne({ sessionId: loginResponse.body.data.sessionId });
    expect(session.isActive).toBe(false);
  });
});
