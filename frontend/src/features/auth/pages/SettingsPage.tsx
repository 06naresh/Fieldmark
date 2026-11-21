import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label } from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { signOut } from '@/services/auth/session';
import { useThemeStore, type ThemePreference } from '@/store/themeStore';

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export function SettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Application preferences and session actions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Fieldmark looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Theme</legend>
            {themeOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-3 text-sm">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="h-4 w-4"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>End your current Fieldmark session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Local data</Label>
          <p className="text-sm text-muted-foreground">
            Offline inspection storage and synchronization preferences are configured in later
            phases. No sensitive session details are stored in this browser.
          </p>
          <Button variant="outline" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
