import { SignInPage } from '@pages/SignInPage';
import { NavigationDrawer } from '@pages/NavigationDrawer';
import { AUTH_CREDENTIALS } from '@auth/credentials';
import { superAdminToken, createVolunteerWithToken, VOLUNTEER_PASSWORD } from '@support/helpers/chat';
import { userMessage, assistantMessage, ok } from '@support/helpers/agent';

// Agent Chats, the super admin's review page. The review routes are answered by cy.intercept, so
// each spec states exactly which members and chats exist; the routes themselves are covered by
// the backend suite (tests/agent/review/).

const NOW = Date.now();
const DELETED_AT = new Date('2026-11-10T09:00:00Z').getTime();

const RAHIM = { _id: 'd00000000000000000000001', name: 'Rahim Uddin', hall: 5, designation: 1 };
const KARIM = { _id: 'd00000000000000000000002', name: 'Karim Hasan', hall: 4, designation: 2 };
const GONE_ID = 'd00000000000000000000003';
// A donor the transcript's search returned, whom the answer offers a Call button for.
const SALMA = { _id: 'e00000000000000000000001', name: 'Salma Akter', phone: 8801700000000, bloodGroup: 4, hall: 5 };

const memberRow = (member: typeof RAHIM | null, donorId: string, chatCount: number, deletedChatCount = 0) => ({
  donorId,
  member,
  chatCount,
  deletedChatCount,
  lastActivity: NOW,
});

const reviewChat = (id: string, owner: string, title: string, deleted = false) => ({
  _id: id,
  owner,
  title,
  createdAt: NOW - 86400000,
  updatedAt: NOW,
  userDeletedChat: deleted,
  userDeletedAt: deleted ? DELETED_AT : null,
  messageCount: 4,
  promptTokens: 2400,
  completionTokens: 60,
});

const KEPT = reviewChat('c00000000000000000000001', RAHIM._id, 'O+ donors in Suhrawardy');
const HIDDEN = reviewChat('c00000000000000000000002', RAHIM._id, 'A chat Rahim deleted', true);
const KARIMS = reviewChat('c00000000000000000000003', KARIM._id, 'Karim\'s only chat');

const transcriptOf = (chat: ReturnType<typeof reviewChat>, member: typeof RAHIM | null) =>
  ok(200, {
    chat,
    member,
    messages: [
      userMessage(0, 'How many O+ donors are in Suhrawardy?'),
      { ...assistantMessage(1, '', ['call_1']) },
      {
        _id: 'm2', seq: 2, role: 'tool', toolCallId: 'call_1', content: '{}', createdAt: NOW,
        run: {
          status: 'done', name: 'SearchDonors', label: 'Search for donors filtered by criteria', method: 'GET',
          path: '/search/v3?bloodGroup=4&hall=5', args: { bloodGroup: 4, hall: 5 }, body: null, isWrite: false,
          httpStatus: 200, durationMs: 120, note: null,
          response: JSON.stringify({ status: 'OK', filteredDonors: [SALMA] }, null, 2),
        },
      },
      assistantMessage(3, `There are 12 O+ donors in Suhrawardy, among them ${SALMA.name} [[call:${SALMA._id}]]`),
    ],
  });

// A small, changeable server: deleting a chat really removes it from what the next list returns.
const stubReview = (initial: { members: ReturnType<typeof memberRow>[]; chats: Record<string, ReturnType<typeof reviewChat>[]> }) => {
  const state = { members: [...initial.members], chats: { ...initial.chats } };
  cy.intercept('GET', '**/agent/review/members', (req) => req.reply(ok(200, { members: state.members }))).as('members');
  cy.intercept('GET', '**/agent/review/members/*/chats', (req) => {
    const donorId = req.url.split('/').slice(-2)[0];
    const member = [RAHIM, KARIM].find((m) => m._id === donorId) || null;
    req.reply(ok(200, { member, chats: state.chats[donorId] || [] }));
  }).as('memberChats');
  cy.intercept('GET', `**/agent/review/chats/${KEPT._id}`, transcriptOf(KEPT, RAHIM)).as('transcript');
  cy.intercept('GET', `**/agent/review/chats/${HIDDEN._id}`, transcriptOf(HIDDEN, RAHIM));
  cy.intercept('GET', `**/agent/review/chats/${KARIMS._id}`, transcriptOf(KARIMS, KARIM));
  cy.intercept('DELETE', '**/agent/review/chats/*', (req) => {
    const chatId = req.url.split('/').pop() as string;
    for (const donorId of Object.keys(state.chats)) {
      state.chats[donorId] = state.chats[donorId].filter((c) => c._id !== chatId);
    }
    // What the server does: a member stays listed while they have any chat left.
    state.members = state.members
      .map((row) => ({ ...row, chatCount: (state.chats[row.donorId] || []).length }))
      .filter((row) => row.chatCount > 0);
    req.reply(ok(200, {}));
  }).as('permanentDelete');
};

const twoMembers = () => ({
  members: [memberRow(RAHIM, RAHIM._id, 2, 1), memberRow(KARIM, KARIM._id, 1)],
  chats: { [RAHIM._id]: [HIDDEN, KEPT], [KARIM._id]: [KARIMS] },
});

const signInAsSuperAdmin = (): void => {
  new SignInPage().signIn(AUTH_CREDENTIALS.phone, AUTH_CREDENTIALS.password);
  cy.url({ timeout: 20000 }).should('include', '/home');
};

describe('Agent Chats', () => {
  describe('on a wide screen', () => {
    beforeEach(() => {
      cy.viewport(1280, 800);
    });

    it('is under Super Admin; members, then their chats, then a read-only transcript', () => {
      stubReview(twoMembers());
      signInAsSuperAdmin();
      new NavigationDrawer().goToAgentChats();
      cy.url().should('include', '/agentChats');

      cy.get('[data-cy="agentChatsMember"]').should('have.length', 2).first()
        .should('contain', 'Rahim Uddin')
        .and('contain', 'Suhrawardy · Volunteer')
        .and('contain', '2 chats, 1 deleted by user');
      cy.get('[data-cy="agentChatsChats"]').should('contain', 'Choose a member to see their chats.');
      cy.get('[data-cy="agentChatsTranscript"]').should('contain', 'Choose a chat to read it.');

      cy.get('[data-cy="agentChatsMember"]').first().click();
      cy.wait('@memberChats');
      cy.get('[data-cy="agentChatsChat"]').should('have.length', 2);
      // The chat Rahim deleted is still here, and says so.
      cy.get('[data-cy="agentChatsChat"]').first().should('contain', 'A chat Rahim deleted')
        .find('[data-cy="agentChatsDeletedTag"]').should('contain', 'Deleted by user ·');
      cy.get('[data-cy="agentChatsChat"]').last().should('contain', '2.4k in · 60 out')
        .find('[data-cy="agentChatsDeletedTag"]').should('not.exist');

      cy.get('[data-cy="agentChatsChat"]').last().click();
      cy.wait('@transcript');
      cy.get('[data-cy="agentChatsTranscriptTitle"]').should('have.text', 'O+ donors in Suhrawardy');
      cy.get('[data-cy="agentChatsTranscript"]').within(() => {
        cy.contains('Rahim Uddin · created').should('be.visible');
        cy.get('[data-cy="agentUserMessage"]').should('contain', 'How many O+ donors are in Suhrawardy?');
        cy.contains('There are 12 O+ donors in Suhrawardy').should('be.visible');
        // A Call button is drawn where the member saw one, but reading a transcript dials nobody.
        cy.get('[data-cy="agentCallButton"]').should('contain', 'Call Salma Akter').and('be.disabled');
        // What each answer cost, for the super admin reviewing it.
        cy.get('[data-cy="agentUsage"]').first().should('have.text', 'gpt-6-luna · 1.2k in · 30 out');
        cy.get('[data-cy="agentToolLabel"]').should('have.text', 'Search for donors filtered by criteria');
        // Read-only: nothing to approve, nothing to retry, nothing to type into, nobody to call.
        cy.get('[data-cy="agentApproveButton"]').should('not.exist');
        cy.get('[data-cy="agentRetryButton"]').should('not.exist');
      });
      cy.get('[data-cy="agentInput"]').should('not.exist');
    });

    it('the System prompt button shows the prompt the backend sends a super admin', () => {
      stubReview({ members: [], chats: {} });
      signInAsSuperAdmin();
      cy.visit('/#/agentChats');

      // Not stubbed: the real /agent/config, which sends the prompt to super admins only.
      cy.get('[data-cy="agentChatsSystemPromptButton"]').should('not.be.disabled').click();
      cy.get('[data-cy="agentChatsSystemPromptDialog"]').should('be.visible');
      cy.get('[data-cy="agentChatsSystemPrompt"]')
        .should('contain', 'You are Badhan Agent')
        .and('contain', '## How values are encoded')
        .and('contain', '## Session');
    });

    it('a member whose donor record is gone is shown as a deleted member', () => {
      stubReview({ members: [memberRow(null, GONE_ID, 1)], chats: {} });
      signInAsSuperAdmin();
      cy.visit('/#/agentChats');

      cy.get('[data-cy="agentChatsMember"]').should('have.length', 1)
        .and('contain', 'Deleted member')
        .and('contain', 'The donor record no longer exists');
    });

    it('a permanent delete, after confirmation, takes the chat out of the list', () => {
      stubReview(twoMembers());
      signInAsSuperAdmin();
      cy.visit('/#/agentChats');

      cy.get('[data-cy="agentChatsMember"]').first().click();
      cy.get('[data-cy="agentChatsChat"]').last().click();
      cy.wait('@transcript');
      cy.get('[data-cy="agentChatsTranscriptDeleteButton"]').click();
      cy.contains('Permanently delete "O+ donors in Suhrawardy" by Rahim Uddin? It is removed from Badhan for good and cannot be undone.')
        .should('be.visible');
      cy.get('[data-cy="confirmationBoxButtonId"]').click();

      cy.wait('@permanentDelete').its('request.url').should('contain', KEPT._id);
      // The members list is fetched again, and Rahim still has a chat.
      cy.wait('@members');
      cy.get('[data-cy="agentChatsChat"]').should('have.length', 1).and('contain', 'A chat Rahim deleted');
      cy.get('[data-cy="agentChatsTranscript"]').should('contain', 'Choose a chat to read it.');
      cy.get('[data-cy="agentChatsMember"]').should('have.length', 2);
    });

    it('deleting a member\'s last chat takes the member out of the list too', () => {
      stubReview(twoMembers());
      signInAsSuperAdmin();
      cy.visit('/#/agentChats');

      cy.get('[data-cy="agentChatsMember"]').contains('Karim Hasan').click();
      cy.get('[data-cy="agentChatsChat"]').should('have.length', 1).find('[data-cy="agentChatsDeleteButton"]').click();
      cy.contains('Permanently delete "Karim\'s only chat" by Karim Hasan?').should('be.visible');
      cy.get('[data-cy="confirmationBoxButtonId"]').click();

      cy.wait('@permanentDelete');
      cy.get('[data-cy="agentChatsMember"]').should('have.length', 1).and('not.contain', 'Karim Hasan');
      cy.get('[data-cy="agentChatsChats"]').should('contain', 'Choose a member to see their chats.');
      cy.get('[data-cy="agentChatsTranscript"]').should('contain', 'Choose a chat to read it.');
    });

    it('with no chats anywhere, says so', () => {
      stubReview({ members: [], chats: {} });
      signInAsSuperAdmin();
      cy.visit('/#/agentChats');

      cy.get('[data-cy="agentChatsEmpty"]').should('be.visible').and('contain', 'No member has an agent chat yet.');
    });
  });

  it('on a phone, one column at a time, with back buttons', () => {
    stubReview(twoMembers());
    signInAsSuperAdmin();
    cy.visit('/#/agentChats');

    cy.get('[data-cy="agentChatsMembers"]').should('be.visible');
    cy.get('[data-cy="agentChatsChats"]').should('not.be.visible');
    cy.get('[data-cy="agentChatsTranscript"]').should('not.be.visible');

    cy.get('[data-cy="agentChatsMember"]').first().click();
    cy.get('[data-cy="agentChatsMembers"]').should('not.be.visible');
    cy.get('[data-cy="agentChatsChats"]').should('be.visible');

    cy.get('[data-cy="agentChatsChat"]').last().click();
    cy.get('[data-cy="agentChatsChats"]').should('not.be.visible');
    cy.get('[data-cy="agentChatsTranscript"]').should('be.visible')
      .and('contain', 'There are 12 O+ donors in Suhrawardy');

    cy.get('[data-cy="agentChatsBackToChats"]').click();
    cy.get('[data-cy="agentChatsChats"]').should('be.visible');
    cy.get('[data-cy="agentChatsBackToMembers"]').click();
    cy.get('[data-cy="agentChatsMembers"]').should('be.visible');
  });

  it('a volunteer who opens it is sent home', () => {
    superAdminToken().then((adminToken) => {
      createVolunteerWithToken(adminToken, 'Review Outsider').then((volunteer) => {
        new SignInPage().signIn(volunteer.localPhone, VOLUNTEER_PASSWORD);
        cy.url({ timeout: 20000 }).should('include', '/home');
        cy.visit('/#/agentChats');
        cy.url().should('include', '/home');
        cy.get('[data-cy="agentChatsPage"]').should('not.exist');
      });
    });
  });
});
