import { Button, Card, CardContent, Container, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FunctionComponent, useEffect, useRef, useState } from 'react';
import DvrIcon from '@mui/icons-material/Dvr';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import CardTitle from '../../components/CardTitle';
import SerialConnectionForm from '../../components/SerialConnectionForm';
import EventsBatcher from '../../library/EventsBatcher';
import {
  SerialMonitorEventType,
  useConnectToSerialDeviceMutation,
  useDisconnectFromSerialDeviceMutation,
  useSerialMonitorEventsSubscription,
  useSerialMonitorLogsSubscription,
} from '../../gql/generated/types';
import Loader from '../../components/Loader';
import ShowAlerts from '../../components/ShowAlerts';
import Logs from '../../components/Logs';

const PREFIX = 'SerialMonitorView';

const classes = {
  root: `${PREFIX}-root`,
  main: `${PREFIX}-main`,
  content: `${PREFIX}-content`,
  disconnectButton: `${PREFIX}-disconnectButton`,
};

const Root = styled('main')(({ theme }) => ({
  [`&.${classes.root}`]: {
    display: 'flex',
  },

  [`& .${classes.main}`]: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
  },

  [`& .${classes.content}`]: {
    flexGrow: 1,
  },

  [`& .${classes.disconnectButton}`]: {
    marginBottom: `${theme.spacing(4)} !important`,
  },
}));

enum ViewState {
  ConnectionConfig = 'ConnectionConfig',
  LogsStream = 'LogsStream',
}

const SerialMonitorView: FunctionComponent = () => {
  const [viewState, setViewState] = useState<ViewState>(
    ViewState.ConnectionConfig
  );

  /*
  We batch log events in order to save React.js state updates and rendering performance.
 */
  const [logs, setLogs] = useState<string>('');
  const logsRef = useRef<string[]>([]);
  const eventsBatcherRef = useRef<EventsBatcher<string> | null>(null);
  useEffect(() => {
    eventsBatcherRef.current = new EventsBatcher<string>(200);
    eventsBatcherRef.current.onBatch((newLogs) => {
      const newLogsList = [...logsRef.current, ...newLogs];
      logsRef.current = newLogsList;
      setLogs(newLogsList.join(''));
    });
  }, []);
  useSerialMonitorLogsSubscription({
    fetchPolicy: 'network-only',
    onSubscriptionData: (options) => {
      const args = options.subscriptionData.data?.serialMonitorLogs.data;
      if (args !== undefined && eventsBatcherRef.current !== null) {
        eventsBatcherRef.current.enqueue(args);
      }
    },
  });

  useSerialMonitorEventsSubscription({
    onSubscriptionData: (options) => {
      const args = options.subscriptionData.data?.serialMonitorEvents;
      if (args !== undefined) {
        if (args.type === SerialMonitorEventType.Disconnected) {
          setViewState(ViewState.ConnectionConfig);
        }
      }
    },
  });

  const [serialDevice, setSerialDevice] = useState<string | null>(null);
  const [baudRate, setBaudRate] = useState<number>(420000);
  const [
    connectToSerialDeviceMutation,
    { loading: connectInProgress, data: response, error: connectError },
  ] = useConnectToSerialDeviceMutation();
  const onConnect = (newSerialDevice: string | null, newBaudRate: number) => {
    setSerialDevice(newSerialDevice);
    setBaudRate(newBaudRate);
    setLogs('');
    logsRef.current = [];
    connectToSerialDeviceMutation({
      variables: {
        input: {
          port: newSerialDevice,
          baudRate: newBaudRate,
        },
      },
    })
      .then((resp) => {
        if (resp.data?.connectToSerialDevice.success) {
          setViewState(ViewState.LogsStream);
        }
      })
      .catch(() => {
        setViewState(ViewState.ConnectionConfig);
      });
  };

  const [
    disconnectFromSerialDeviceMutation,
    { loading: disconnectInProgress, error: disconnectError },
  ] = useDisconnectFromSerialDeviceMutation();
  const onDisconnect = () => {
    disconnectFromSerialDeviceMutation()
      .then((data) => {
        if (data.data?.disconnectFromSerialDevice.success) {
          setViewState(ViewState.ConnectionConfig);
        }
      })
      .catch(() => {});
  };
  return (
    <Root className={classes.root}>
      <Sidebar navigationEnabled />
      <div className={classes.content}>
        <Header />
        <Container className={classes.main}>
          <Card>
            <CardTitle icon={<DvrIcon />} title="Serial Monitor" />
            <Divider />
            <CardContent>
              {viewState === ViewState.ConnectionConfig && (
                <>
                  <SerialConnectionForm
                    serialDevice={serialDevice}
                    baudRate={baudRate}
                    onConnect={onConnect}
                  />
                  <Loader loading={connectInProgress} />
                  {response && !response.connectToSerialDevice.success && (
                    <ShowAlerts
                      severity="error"
                      messages={response.connectToSerialDevice.message}
                    />
                  )}
                  <ShowAlerts severity="error" messages={connectError} />
                </>
              )}
              <ShowAlerts severity="error" messages={disconnectError} />
              {viewState === ViewState.LogsStream && (
                <>
                  <Button
                    onClick={onDisconnect}
                    color="secondary"
                    size="large"
                    variant="contained"
                    className={classes.disconnectButton}
                  >
                    Disconnect
                  </Button>
                  <Loader loading={disconnectInProgress} />
                  <Logs data={logs} />
                </>
              )}
            </CardContent>
          </Card>
        </Container>
      </div>
    </Root>
  );
};

export default SerialMonitorView;
