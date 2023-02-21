import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { getDataFromTree } from '@apollo/client/react/ssr';
import dynamic from 'next/dynamic';
import { useRouter, withRouter } from 'next/router';
import { createGlobalStyle } from 'styled-components';

import { initClient } from '../lib/apollo-client';
import { getCollectivePageMetadata } from '../lib/collective.lib';
import { generateNotFoundError } from '../lib/errors';
import useLoggedInUser from '../lib/hooks/useLoggedInUser';
import { addParentToURLIfMissing, getCollectivePageCanonicalURL } from '../lib/url-helpers';

import CollectivePageContent from '../components/collective-page';
import CollectiveNotificationBar from '../components/collective-page/CollectiveNotificationBar';
import { preloadCollectivePageGraphqlQueries } from '../components/collective-page/graphql/preload';
import { collectivePageQuery, getCollectivePageQueryVariables } from '../components/collective-page/graphql/queries';
import CollectiveThemeProvider from '../components/CollectiveThemeProvider';
import Container from '../components/Container';
import ErrorPage from '../components/ErrorPage';
import Loading from '../components/Loading';
import Page from '../components/Page';

import Custom404 from './404';

/** A page rendered when collective is pledged and not active yet */
const PledgedCollectivePage = dynamic(
  () => import(/* webpackChunkName: 'PledgedCollectivePage' */ '../components/PledgedCollectivePage'),
  { loading: Loading },
);

/** A page rendered when collective is incognito */
const IncognitoUserCollective = dynamic(
  () => import(/* webpackChunkName: 'IncognitoUserCollective' */ '../components/IncognitoUserCollective'),
  { loading: Loading },
);

/** A page rendered when collective is guest */
const GuestUserProfile = dynamic(
  () => import(/* webpackChunkName: 'GuestUserProfile' */ '../components/GuestUserProfile'),
  { loading: Loading },
);

/** Load the onboarding modal dynamically since it's not used often */
const OnboardingModal = dynamic(
  () => import(/* webpackChunkName: 'OnboardingModal' */ '../components/onboarding-modal/OnboardingModal'),
  { loading: Loading },
);

const GlobalStyles = createGlobalStyle`
  section {
    margin: 0;
  }
`;

// type CollectivePageProps = {
//   slug: string; // from getInitialProps
//   /** A special status to show the notification bar (collective created, archived...etc) */
//   status: 'collectiveCreated' | 'collectiveArchived' | 'fundCreated' | 'projectCreated' | 'eventCreated';
//   step: string;
//   mode: string;
//   action: string;
//   router: object;
//   data: 111111;
// };

/*
data: PropTypes.shape({
      loading: PropTypes.bool,
      error: PropTypes.any,
      account: PropTypes.object,
      Collective: PropTypes.shape({
        name: PropTypes.string,
        type: PropTypes.string.isRequired,
        description: PropTypes.string,
        twitterHandle: PropTypes.string,
        image: PropTypes.string,
        isApproved: PropTypes.bool,
        isArchived: PropTypes.bool,
        isHost: PropTypes.bool,
        isActive: PropTypes.bool,
        isPledged: PropTypes.bool,
        isIncognito: PropTypes.bool,
        isGuest: PropTypes.bool,
        parentCollective: PropTypes.shape({ slug: PropTypes.string, image: PropTypes.string }),
        host: PropTypes.object,
        stats: PropTypes.object,
        coreContributors: PropTypes.arrayOf(PropTypes.object),
        financialContributors: PropTypes.arrayOf(PropTypes.object),
        tiers: PropTypes.arrayOf(PropTypes.object),
        events: PropTypes.arrayOf(PropTypes.object),
        connectedCollectives: PropTypes.arrayOf(PropTypes.object),
        transactions: PropTypes.arrayOf(PropTypes.object),
        expenses: PropTypes.arrayOf(PropTypes.object),
        updates: PropTypes.arrayOf(PropTypes.object),
      }),
      refetch: PropTypes.func,
    }).isRequired, // from withData
*/

/**
 * The main page to display collectives. Wrap route parameters and GraphQL query
 * to render `components/collective-page` with everything needed.
 */

const CollectivePage = (/* props: CollectivePageProps */) => {
  /* const { slug, status, step, mode, action } = props; */
  console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  const { LoggedInUser } = useLoggedInUser();
  const router = useRouter();
  const { slug, status, step, mode, action } = router.query;
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(true);
  console.log('slug frontend', slug);

  console.log('LoggedInUser', LoggedInUser);

  const { data, loading } = useQuery(collectivePageQuery, {
    variables: getCollectivePageQueryVariables(slug),
    ssr: true,
  });

  console.log('data', data);

  useEffect(() => {
    const collective = data?.Collective;
    addParentToURLIfMissing(router, collective);
  }, []);

  /* const loading = data.loading && !data.Collective; */
  const collective = data && data.Collective;

  if (!loading) {
    if (!data || data.error) {
      return <ErrorPage data={data} />;
    } else if (!data.Collective) {
      return <ErrorPage error={generateNotFoundError(slug)} log={false} />;
    } else if (data.Collective.isPledged && !data.Collective.isActive) {
      return <PledgedCollectivePage collective={data.Collective} />;
    } else if (data.Collective.isIncognito) {
      return <IncognitoUserCollective collective={data.Collective} />;
    } else if (data.Collective.isGuest) {
      return <GuestUserProfile account={data.Collective} />;
    }
  }

  // Don't allow /collective/apply
  if (action === 'apply' && !collective?.isHost) {
    return <Custom404 />;
  }

  return (
    <Page
      collective={collective}
      canonicalURL={getCollectivePageCanonicalURL(collective)}
      {...getCollectivePageMetadata(collective)}
    >
      <GlobalStyles />
      {loading ? (
        <Container py={[5, 6]}>
          <Loading />
        </Container>
      ) : (
        <React.Fragment>
          <CollectiveNotificationBar
            collective={collective}
            host={collective.host}
            status={status}
            LoggedInUser={LoggedInUser}
            refetch={data.refetch}
          />
          <CollectiveThemeProvider collective={collective}>
            {({ onPrimaryColorChange }) => (
              <CollectivePageContent
                collective={collective}
                host={collective.host}
                coreContributors={collective.coreContributors}
                financialContributors={collective.financialContributors}
                tiers={collective.tiers}
                events={collective.events}
                projects={collective.projects}
                connectedCollectives={collective.connectedCollectives}
                transactions={collective.transactions}
                expenses={collective.expenses}
                stats={collective.stats}
                updates={collective.updates}
                conversations={collective.conversations}
                LoggedInUser={LoggedInUser}
                isAdmin={Boolean(LoggedInUser && LoggedInUser.isAdminOfCollective(collective))}
                isHostAdmin={Boolean(LoggedInUser && LoggedInUser.isHostAdmin(collective))}
                isRoot={Boolean(LoggedInUser && LoggedInUser.isRoot)}
                onPrimaryColorChange={onPrimaryColorChange}
                step={step}
                mode={mode}
                refetch={data.refetch}
              />
            )}
          </CollectiveThemeProvider>
          {mode === 'onboarding' && LoggedInUser?.isAdminOfCollective(collective) && (
            <OnboardingModal
              showOnboardingModal={showOnboardingModal}
              setShowOnboardingModal={setShowOnboardingModal}
              step={step}
              mode={mode}
              collective={collective}
              LoggedInUser={LoggedInUser}
            />
          )}
        </React.Fragment>
      )}
    </Page>
  );
};

export async function getServerSideProps({ req, res, query: { slug } }) {
  if (res && req && (req.language || req.locale === 'en')) {
    res.set('Cache-Control', 'public, s-maxage=300');
  }

  // If on server side
  if (req) {
    const client = initClient();
    const collective = await preloadCollectivePageGraphqlQueries(slug, client);

    if (!collective) {
      return {
        notFound: true,
      };
    }
  }

  return {
    props: {},
  };
}

export default CollectivePage;
