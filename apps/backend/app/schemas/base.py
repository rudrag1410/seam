from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    """Base for every API schema. Fields that have defaults are always present in responses,
    so the generated TypeScript client types them as required."""

    model_config = ConfigDict(json_schema_serialization_defaults_required=True)
