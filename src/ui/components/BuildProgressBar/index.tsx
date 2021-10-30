import React, { FunctionComponent, memo } from 'react';
import { styled } from '@mui/material/styles';
import { LinearProgress } from '@mui/material';
import {
  BuildFirmwareStep,
  BuildJobType,
  BuildProgressNotification,
} from '../../gql/generated/types';

const PREFIX = 'BuildProgressBar';

const classes = {
  root: `${PREFIX}-root`,
};

const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  [`&.${classes.root}`]: {
    height: 12,
    marginTop: `${theme.spacing(1)} !important`,
    marginBottom: `${theme.spacing(2)} !important`,
  },
}));

interface BuildProgressBarProps {
  inProgress: boolean;
  jobType: BuildJobType;
  progressNotification: BuildProgressNotification | null;
}

const BuildProgressBar: FunctionComponent<BuildProgressBarProps> = memo(
  ({ inProgress, jobType, progressNotification }) => {
    const toProgressValue = (
      notification: BuildProgressNotification | null
    ): number => {
      if (notification === null) {
        return 0;
      }
      if (!inProgress) {
        return 100;
      }
      switch (jobType) {
        case BuildJobType.Build:
          switch (notification.step) {
            case BuildFirmwareStep.VERIFYING_BUILD_SYSTEM:
              return 10;
            case BuildFirmwareStep.DOWNLOADING_FIRMWARE:
              return 35;
            case BuildFirmwareStep.BUILDING_USER_DEFINES:
              return 37;
            case BuildFirmwareStep.BUILDING_FIRMWARE:
              return 77;
            default:
          }
          break;
        case BuildJobType.BuildAndFlash:
          switch (notification.step) {
            case BuildFirmwareStep.VERIFYING_BUILD_SYSTEM:
              return 5;
            case BuildFirmwareStep.DOWNLOADING_FIRMWARE:
              return 15;
            case BuildFirmwareStep.BUILDING_USER_DEFINES:
              return 28;
            case BuildFirmwareStep.BUILDING_FIRMWARE:
              return 56;
            case BuildFirmwareStep.FLASHING_FIRMWARE:
              return 89;
            default:
          }
          break;
        default:
          throw new Error(`unhandled job type: ${jobType}`);
      }

      return 100;
    };
    return (
      <StyledLinearProgress
        className={classes.root}
        variant="determinate"
        value={toProgressValue(progressNotification)}
      />
    );
  }
);

export default BuildProgressBar;
