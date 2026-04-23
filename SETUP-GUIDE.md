# AdPulse — OAuth Setup Guide

Αυτός ο οδηγός εξηγεί πώς δημιουργείς τα **app credentials** σε Google και Meta ώστε το AdPulse να μπορεί να ανοίγει OAuth popups και να τραβάει τους ad accounts σου. Κάνεις αυτό **μία φορά** — μετά απλά κάνεις click "Login with Google" / "Login with Meta" από το UI.

---

## Τι χρειάζεσαι

| Credential | Πού το βρίσκεις | Σε τι χρησιμεύει |
|---|---|---|
| Google Client ID | Google Cloud Console | Ταυτοποιεί το AdPulse app στο Google |
| Google Client Secret | Google Cloud Console | Αποδεικνύει ότι το app είναι αυθεντικό |
| Google Ads Developer Token | Google Ads UI (API Center) | Επιτρέπει API calls στο Google Ads |
| Meta App ID | Meta Developer Portal | Ταυτοποιεί το AdPulse app στο Meta |
| Meta App Secret | Meta Developer Portal | Αποδεικνύει ότι το app είναι αυθεντικό |

---

## Μέρος 1 — Google Setup (≈10 λεπτά)

### Βήμα 1.1: Δημιουργία Google Cloud Project

1. Πήγαινε στο [Google Cloud Console](https://console.cloud.google.com/)
2. Κάνε login με τον Google account σου
3. Πάνω αριστερά, click στο project selector → **New Project**
4. Όνομα: `AdPulse` (ή ό,τι θέλεις)
5. Click **Create**

### Βήμα 1.2: Ενεργοποίηση APIs

1. Πήγαινε **APIs & Services → Library**
2. Ψάξε και ενεργοποίησε τα εξής (click Enable σε κάθε ένα):
   - **Google Ads API**
   - **Google Analytics Admin API**
   - **Google Analytics Data API**

### Βήμα 1.3: OAuth Consent Screen

1. Πήγαινε **APIs & Services → OAuth consent screen** (ή Google Auth Platform → Branding)
2. User type: **External** (αν δεν είσαι σε Google Workspace)
3. Συμπλήρωσε:
   - App name: `AdPulse`
   - User support email: το email σου
   - Developer contact email: το email σου
4. **Save**
5. Στη σελίδα **Scopes** / **Data Access**, δεν χρειάζεται να προσθέσεις τίποτα (τα scopes τα στέλνει ο server δυναμικά)
6. Στη σελίδα **Test users**, πρόσθεσε τον Google account σου
7. **Save**

> **Σημείωση**: Όσο το app είναι σε "Testing" mode, μόνο οι test users μπορούν να κάνουν login. Αυτό είναι ΟΚ για εσωτερική χρήση. Αν θέλεις να το ανοίξεις, κάνε publish (δεν χρειάζεται review αν δεν χρησιμοποιείς sensitive scopes).

### Βήμα 1.4: Δημιουργία OAuth Client ID

1. Πήγαινε **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth Client ID**
3. Application type: **Web application**
4. Name: `AdPulse Local`
5. **Authorized redirect URIs** — πρόσθεσε:
   ```
   http://127.0.0.1:8787/api/auth/google_ads/callback
   http://127.0.0.1:8787/api/auth/ga4/callback
   ```
   (Αν τρέχεις σε άλλο port ή domain, πρόσθεσε κι αυτά)
6. Click **Create**
7. **Αντίγραψε τα Client ID και Client Secret** — θα τα βάλεις στο Setup Wizard

### Βήμα 1.5: Google Ads Developer Token

1. Πήγαινε στο [Google Ads](https://ads.google.com/) και κάνε login
2. Χρειάζεσαι **Manager Account** (MCC). Αν δεν έχεις, δημιούργησε ένα στο [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts/)
3. Μέσα στο Manager Account, πήγαινε **Admin → API Center**
   (ή απευθείας: `https://ads.google.com/aw/apicenter`)
4. Συμπλήρωσε τη φόρμα αν σου ζητηθεί
5. **Αντίγραψε το Developer Token** (22 χαρακτήρες)
6. Αρχικά θα είναι σε **Test** ή **Explorer** access — αρκεί για αρχή. Μπορείς αργότερα να κάνεις apply για Basic Access.

---

## Μέρος 2 — Meta Setup (≈10 λεπτά)

### Βήμα 2.1: Δημιουργία Meta Developer Account

1. Πήγαινε στο [Meta for Developers](https://developers.facebook.com/)
2. Login με τον Facebook account σου
3. Αν δεν είσαι developer, click **Get Started** και ακολούθησε τα βήματα

### Βήμα 2.2: Δημιουργία App

1. Πήγαινε **My Apps → Create App**
2. Use case: Επέλεξε **Other** → **Next**
3. App type: **Business** → **Next**
4. Συμπλήρωσε:
   - App name: `AdPulse`
   - App contact email: το email σου
   - Business portfolio: συνέδεσε το Business Manager σου (αν έχεις)
5. Click **Create App**

### Βήμα 2.3: Πρόσθεσε Products

1. Στο App Dashboard, πήγαινε **Add Products** (αριστερό sidebar)
2. Βρες **Facebook Login for Business** → click **Set Up**
3. Βρες **Marketing API** → click **Set Up**

### Βήμα 2.4: Ρύθμισε OAuth Redirect

1. Πήγαινε **Facebook Login for Business → Settings** (ή **Facebook Login → Settings**)
2. Στο **Valid OAuth Redirect URIs**, πρόσθεσε:
   ```
   http://127.0.0.1:8787/api/auth/meta_ads/callback
   ```
3. **Save Changes**

### Βήμα 2.5: Πάρε App ID & Secret

1. Πήγαινε **App Settings → Basic** (αριστερό sidebar)
2. **App ID** — φαίνεται πάνω-πάνω
3. **App Secret** — click **Show**, βάλε τον κωδικό σου
4. **Αντίγραψε και τα δύο** — θα τα βάλεις στο Setup Wizard

### Βήμα 2.6: Permissions (Scopes)

Στο **App Review → Permissions and Features**, βεβαιώσου ότι τα παρακάτω είναι enabled (τουλάχιστον σε Standard Access):
- `ads_read`
- `ads_management`
- `business_management`
- `read_insights`

> **Σημείωση**: Σε development mode, μπορείς να χρησιμοποιήσεις αυτά τα permissions χωρίς review, αρκεί ο χρήστης να είναι admin/developer του app.

---

## Μέρος 3 — Βάλε τα Credentials στο AdPulse

### Επιλογή A: Setup Wizard (recommended)

1. Τρέξε `npm run dev`
2. Πήγαινε στο `http://127.0.0.1:5173`
3. Στο Settings → **Platform Setup**, συμπλήρωσε τα πεδία
4. Click **Save** — αποθηκεύονται server-side στο `.env.local`
5. Ο server κάνει reload αυτόματα

### Επιλογή B: Χειροκίνητα

Δημιούργησε αρχείο `.env.local` στο root folder του project:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxxxxxxxxxxxxxxxxxxxxx
META_APP_ID=123456789
META_APP_SECRET=abcdef123456
```

Κάνε restart τον server.

---

## Μέρος 4 — Login Flow

Αφού βάλεις τα credentials:

1. Πήγαινε στο **Connections** tab στο AdPulse
2. Click **Login with Google** → ανοίγει popup → κάνεις login → δίνεις permissions → το popup κλείνει
3. Το AdPulse τραβάει **αυτόματα** όλους τους Google Ads accounts στους οποίους έχεις πρόσβαση
4. Κάνε το ίδιο για **Login with Meta** → τραβάει όλους τους Meta ad accounts
5. Κάνε το ίδιο για **Login with Google Analytics** → τραβάει όλα τα GA4 properties

Τα accounts εμφανίζονται στο Connections tab και μπορείς να τα αντιστοιχίσεις σε clients.

---

## FAQ

**Q: Γιατί χρειάζομαι Developer Token για Google Ads;**
Η Google Ads API απαιτεί ένα developer token σε κάθε request. Χωρίς αυτό, δεν μπορεί να γίνει sync accounts. Δεν κοστίζει κάτι.

**Q: Τι γίνεται αν το Google app μου είναι σε Testing mode;**
Λειτουργεί κανονικά αρκεί ο Google account σου να είναι στη λίστα test users. Για production χρήση, κάνε publish το app.

**Q: Τα tokens λήγουν;**
- Google: Χρησιμοποιεί refresh tokens, ανανεώνεται αυτόματα
- Meta: Long-lived token (60 ημέρες). Μετά θα χρειαστεί reconnect

**Q: Μπορώ να χρησιμοποιήσω τα ίδια credentials σε production;**
Ναι, αλλά πρέπει να αλλάξεις τα redirect URIs στο production domain.
