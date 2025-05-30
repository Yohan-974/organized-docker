import { useAppTranslation } from '@hooks/index';
import { MonthDetailsProps } from './index.types';
import Badge from '@components/badge';

const MonthDetails = ({
  bible_studies,
  isAhead,
  isCurrent,
  credit_hours,
  field_hours,
}: MonthDetailsProps) => {
  const { t } = useAppTranslation();

  return (
    <>
      {isCurrent && (
        <Badge
          className="body-small-semibold"
          size="big"
          color="grey"
          sx={{ borderRadius: 'var(--radius-s)' }}
          text={t('tr_inProgress')}
        />
      )}

      {isAhead && (
        <Badge
          faded
          className="body-small-semibold"
          size="big"
          color="grey"
          sx={{ borderRadius: 'var(--radius-s)' }}
          text={t('tr_ahead')}
        />
      )}

      {!isCurrent && !isAhead && (
        <>
          {bible_studies > 0 && (
            <Badge
              className="body-small-semibold"
              size="big"
              color="grey"
              sx={{ borderRadius: 'var(--radius-s)' }}
              text={t('tr_bibleStudyCountAbbreviated', {
                count: bible_studies,
              })}
            />
          )}

          {field_hours > 0 && (
            <Badge
              className="body-small-semibold"
              size="big"
              color="grey"
              sx={{ borderRadius: 'var(--radius-s)' }}
              text={t('tr_hoursList', {
                Hours: field_hours,
              })}
            />
          )}

          {credit_hours > 0 && (
            <Badge
              className="body-small-semibold"
              size="big"
              color="grey"
              sx={{ borderRadius: 'var(--radius-s)' }}
              text={`${t('tr_credit')}: ${credit_hours}`}
            />
          )}
        </>
      )}
    </>
  );
};

export default MonthDetails;
