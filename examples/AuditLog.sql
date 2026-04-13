USE [Arkiv_app]
GO

/****** Object:  Table [dbo].[AuditLog]    Script Date: 2026-03-17 11:16:18 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[AuditLog](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[timestamp] [datetime2](7) NOT NULL,
	[user] [nvarchar](255) NULL,
	[url] [nvarchar](2000) NOT NULL,
	[verb] [nvarchar](10) NOT NULL,
	[body] [nvarchar](max) NULL,
	[ip] [nvarchar](45) NULL,
	[userAgent] [nvarchar](500) NULL,
	[createdAt] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[AuditLog] ADD  CONSTRAINT [auditlog_timestamp_default]  DEFAULT (getdate()) FOR [timestamp]
GO

ALTER TABLE [dbo].[AuditLog] ADD  CONSTRAINT [auditlog_createdat_default]  DEFAULT (getdate()) FOR [createdAt]
GO

