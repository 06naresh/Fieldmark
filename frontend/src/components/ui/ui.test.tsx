import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  LoadingIndicator,
  Select,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ToastProvider,
  toast,
} from '@/components/ui';

describe('shared UI components', () => {
  it('renders form, data-display, and feedback components', () => {
    render(
      <div>
        <Input aria-label="Site name" placeholder="Enter site name" />
        <Badge variant="success">Synced</Badge>
        <Skeleton data-testid="skeleton" className="h-4 w-24" />
        <LoadingIndicator label="Loading inspections" />
        <EmptyState title="No inspections" description="You are all caught up." />
        <Card>
          <CardHeader>
            <CardTitle>Site summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>Assigned sites</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>North Site</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>,
    );

    expect(screen.getByPlaceholderText('Enter site name')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading inspections');
    expect(screen.getByText('No inspections')).toBeInTheDocument();
    expect(screen.getByText('You are all caught up.')).toBeInTheDocument();
    expect(screen.getByText('Site summary')).toBeInTheDocument();
    expect(screen.getByText('North Site')).toBeInTheDocument();
  });

  it('honours disabled buttons', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button disabled onClick={onClick}>Save draft</Button>);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports dialogs, dropdown menus, selects, and tabs', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Confirm save</DialogTitle>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>View profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Select>
          <SelectTrigger aria-label="Status">
            <SelectValue placeholder="Choose status" />
          </SelectTrigger>
        </Select>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="details">Inspection details</TabsContent>
          <TabsContent value="history">Inspection history</TabsContent>
        </Tabs>
      </div>,
    );

    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Choose status');
    expect(screen.getByText('Inspection details')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'History' }));
    expect(screen.getByText('Inspection history')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(await screen.findByText('Confirm save')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(await screen.findByText('View profile')).toBeVisible();
  });

  it('renders an error state with a retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState message="The server could not be reached." onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The server could not be reached.');
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows toast notifications', async () => {
    render(<ToastProvider><div /></ToastProvider>);

    act(() => {
      toast({ title: 'Saved locally', description: 'Your answers are safe offline.' });
    });

    expect(await screen.findByText('Saved locally')).toBeInTheDocument();
    expect(screen.getByText('Your answers are safe offline.')).toBeInTheDocument();
  });
});
