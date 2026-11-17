export type User = {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string | null;
  avatarMediaId?: string | null;
  avatarUrl?: string | null;
  accountType?: 'Musician' | 'EventOrganizer';
  accountTypeSelected?: boolean;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  onboardingStatus?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  roles?: string[];
  organizationMemberships?: Array<{
    role: string;
    status: string;
    organization: {
      id: string;
      name: string;
      type?: string | null;
      logoUrl?: string | null;
      isActive: boolean;
      isPublished: boolean;
    };
  }>;
  availablePublishingIdentities?: Array<{
    type: 'Personal' | 'Organization';
    id: string;
    name: string;
    logoUrl?: string | null;
    role?: string;
  }>;
  profile?: {
    stageName?: string | null;
    headline?: string | null;
    biography?: string | null;
    city?: string | null;
    country?: string | null;
    visibility?: string;
  } | null;
};

export type Post = {
  id: string;
  content?: string | null;
  type?: string;
  createdAt: string;
  author?: User;
  community?: { id: string; name: string } | null;
  organization?: { id: string; name: string; type?: string | null; logoUrl?: string | null } | null;
  reactions?: Array<{ id: string; userId: string; type: string }>;
  comments?: Array<{ id: string }>;
  media?: Array<{ id: string; mediaUrl: string; mimeType?: string | null }>;
  poll?: {
    id: string;
    question: string;
    options: Array<{ id: string; text: string; votes: Array<{ userId: string }> }>;
  } | null;
};

export type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  organizerId?: string;
  organizationId?: string | null;
  location?: string | null;
  eventDate?: string | null;
  deadline?: string | null;
  budget?: string | number | null;
  currency?: string;
  status?: string;
  organizer?: User;
  organization?: { id: string; name: string; type?: string | null; logoUrl?: string | null; location?: string | null } | null;
};

export type Conversation = {
  id: string;
  title?: string | null;
  type: string;
  members: Array<{ userId: string; user: User }>;
  messages: Message[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string | null;
  type: string;
  createdAt: string;
  sender?: User;
  receipts?: Array<{ userId: string; deliveredAt?: string | null; readAt?: string | null }>;
};

export type NotificationItem = {
  id: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entityId?: string | null;
};
