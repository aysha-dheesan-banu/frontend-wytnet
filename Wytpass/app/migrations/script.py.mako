from alembic import op
import sqlalchemy as sa
% if imports:
${imports}
% endif


# revision identifiers, used by Alembic.
revision = '${up_revision}'
% if down_revision:
down_revision = '${down_revision}'
% else:
down_revision = None
% endif
branch_labels = None
depends_on = None


def upgrade():
% if upgrades:
    ${upgrades | n}
% else:
    pass
% endif


def downgrade():
% if downgrades:
    ${downgrades | n}
% else:
    pass
% endif
