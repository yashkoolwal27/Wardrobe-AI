import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { WardrobePage } from './pages/WardrobePage';
import { OutfitBuilderPage } from './pages/OutfitBuilderPage';
import { LookbookPage } from './pages/LookbookPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Public routing pathways */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Authed routing pathways */}
          <Route path="/wardrobe" element={<WardrobePage />} />
          <Route path="/builder" element={<OutfitBuilderPage />} />
          <Route path="/lookbook" element={<LookbookPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/wardrobe" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
export default App;
