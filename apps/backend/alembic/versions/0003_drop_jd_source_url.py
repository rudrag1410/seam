import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("job_descriptions", "source_url")


def downgrade() -> None:
    op.add_column("job_descriptions", sa.Column("source_url", sa.String(length=1000), nullable=True))
