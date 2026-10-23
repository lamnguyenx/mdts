import React from 'react';
import { Center, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorViewProps {
  error: string | null;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error }) => {
  if (!error) {
    return null;
  }

  const message = error.includes('404') ? 'Not Found' : `Error: ${error}`;

  return (
    <Center h="100%" p="xl">
      <Stack align="center" gap="sm">
        <IconAlertTriangle size={60} color="var(--mantine-color-dimmed)" stroke={1.5} />
        <Text size="xl" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Center>
  );
};

export default ErrorView;
