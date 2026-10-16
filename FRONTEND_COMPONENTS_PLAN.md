/**
 * FRONTEND CERTIFICATE COMPONENTS
 * 
 * This file documents all the React components needed for the certificate system
 * 
 * Components to create:
 * 1. CertificateCard - Display a single certificate in grid/list
 * 2. CertificatePreview - Modal/full-page preview of certificate
 * 3. CertificateDownloadButton - Button to download PDF
 * 4. CertificateShareModal - Share dialog with copy-to-clipboard
 * 5. CertificateList - Grid/list of multiple certificates
 * 6. CertificatesPage (Trainee) - Full page for trainee certificates
 * 7. CertificatesPage (Trainer) - List of issued certificates
 * 8. CertificatesPage (Admin) - Admin dashboard for all certificates
 * 9. NotificationBell - Bell icon with unread count
 * 10. NotificationCenter - Full notification panel
 */

export const COMPONENT_PATHS = {
  certificates: 'src/components/certificates',
  pages: 'src/pages',
};

export const COMPONENTS_TO_CREATE = [
  {
    path: 'src/components/certificates/CertificateCard.tsx',
    description: 'Display single certificate in grid/list format',
    props: ['certificate', 'onDownload', 'onShare', 'onPreview'],
  },
  {
    path: 'src/components/certificates/CertificatePreview.tsx',
    description: 'Modal or full-page preview of certificate PDF',
    props: ['certificate', 'isOpen', 'onClose'],
  },
  {
    path: 'src/components/certificates/CertificateDownloadButton.tsx',
    description: 'Button to trigger PDF download',
    props: ['certificateId', 'fileName'],
  },
  {
    path: 'src/components/certificates/CertificateShareModal.tsx',
    description: 'Dialog to create and share certificate link',
    props: ['certificate', 'isOpen', 'onClose'],
  },
  {
    path: 'src/components/certificates/CertificateList.tsx',
    description: 'Grid or list of multiple certificates with pagination',
    props: ['certificates', 'isLoading', 'onPageChange'],
  },
  {
    path: 'src/pages/trainee/CertificatesPage.tsx',
    description: 'Trainee dashboard showing all earned certificates',
  },
  {
    path: 'src/pages/trainer/CertificatesPage.tsx',
    description: 'Trainer dashboard showing issued certificates',
  },
  {
    path: 'src/pages/admin/CertificatesPage.tsx',
    description: 'Admin dashboard with all certificates and management',
  },
  {
    path: 'src/components/notifications/NotificationBell.tsx',
    description: 'Bell icon with unread count badge',
  },
  {
    path: 'src/components/notifications/NotificationCenter.tsx',
    description: 'Full notification panel with read/unread management',
  },
];

export const API_HOOKS_NEEDED = [
  {
    name: 'useCertificates',
    methods: [
      'getCertificates(page, limit)',
      'getCertificateById(id)',
      'downloadCertificate(id)',
      'createShareLink(id, isPublic)',
      'verifyCertificate(code)',
    ],
  },
  {
    name: 'useNotifications',
    methods: [
      'getNotifications(page, limit, unreadOnly)',
      'getUnreadCount()',
      'markAsRead(id)',
      'markAllAsRead()',
      'deleteNotification(id)',
    ],
  },
];
