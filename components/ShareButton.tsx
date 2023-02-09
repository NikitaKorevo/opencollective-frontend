import React from 'react';
import { Share2 as ShareIcon } from '@styled-icons/feather/Share2';
import { FormattedMessage } from 'react-intl';

import useClipboard from '../lib/hooks/useClipboard';

import StyledButton from './StyledButton';
import { Span } from './Text';

type ShareButtonProps = {
  anchorHash?: string;
};

const ShareButton = ({ anchorHash }: ShareButtonProps) => {
  const { isCopied, copy } = useClipboard();

  const handleClick = () => {
    const [baseLink] = window.location.href.split('#');
    const linkWithAnchorHash = `${baseLink}${anchorHash ? `#${anchorHash}` : ''}`;

    copy(linkWithAnchorHash);
  };

  return (
    <StyledButton buttonSize="tiny" onClick={handleClick}>
      <ShareIcon size={12} />
      <Span ml={1}>
        {isCopied ? (
          <FormattedMessage id="Clipboard.Copied" defaultMessage="Copied!" />
        ) : (
          <FormattedMessage defaultMessage="Share link" />
        )}
      </Span>
    </StyledButton>
  );
};

export default ShareButton;
