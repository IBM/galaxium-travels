# Auto Scaling for ECS Services to enable scale-to-zero

# Backend Service Auto Scaling Target
resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 4
  min_capacity       = 0
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Backend Service Auto Scaling Policy - Target Tracking based on ALB Request Count
resource "aws_appautoscaling_policy" "backend_target_tracking" {
  name               = "${var.project_name}-backend-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 100.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.backend.arn_suffix}"
    }
  }
}

# Backend Service Scheduled Scaling - Scale down to 0 after 2 hours of inactivity
resource "aws_appautoscaling_scheduled_action" "backend_scale_down" {
  name               = "${var.project_name}-backend-scale-down"
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  schedule           = "cron(0 2 * * ? *)" # 2 AM UTC daily

  scalable_target_action {
    min_capacity = 0
    max_capacity = 0
  }
}

# Backend Service Scheduled Scaling - Scale up during business hours
resource "aws_appautoscaling_scheduled_action" "backend_scale_up" {
  name               = "${var.project_name}-backend-scale-up"
  service_namespace  = aws_appautoscaling_target.backend.service_namespace
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  schedule           = "cron(0 8 * * ? *)" # 8 AM UTC daily

  scalable_target_action {
    min_capacity = 0
    max_capacity = 4
  }
}

# Frontend Service Auto Scaling Target
resource "aws_appautoscaling_target" "frontend" {
  max_capacity       = 4
  min_capacity       = 0
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Frontend Service Auto Scaling Policy - Target Tracking based on ALB Request Count
resource "aws_appautoscaling_policy" "frontend_target_tracking" {
  name               = "${var.project_name}-frontend-target-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 100.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.frontend.arn_suffix}"
    }
  }
}

# Frontend Service Scheduled Scaling - Scale down to 0 after 2 hours of inactivity
resource "aws_appautoscaling_scheduled_action" "frontend_scale_down" {
  name               = "${var.project_name}-frontend-scale-down"
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  schedule           = "cron(0 2 * * ? *)" # 2 AM UTC daily

  scalable_target_action {
    min_capacity = 0
    max_capacity = 0
  }
}

# Frontend Service Scheduled Scaling - Scale up during business hours
resource "aws_appautoscaling_scheduled_action" "frontend_scale_up" {
  name               = "${var.project_name}-frontend-scale-up"
  service_namespace  = aws_appautoscaling_target.frontend.service_namespace
  resource_id        = aws_appautoscaling_target.frontend.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend.scalable_dimension
  schedule           = "cron(0 8 * * ? *)" # 8 AM UTC daily

  scalable_target_action {
    min_capacity = 0
    max_capacity = 4
  }
}