import { Center, Loader } from '@mantine/core';
import React from 'react';

export const LoadingIndicator: React.FC = () => (
  <Center py="xl">
    <Loader role="progressbar" size="sm" />
  </Center>
);
